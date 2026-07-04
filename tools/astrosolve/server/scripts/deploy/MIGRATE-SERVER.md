# Migrate Astrosolve to a New Server

This is the complete, self-contained runbook for **moving a running Astrosolve backend to a different
box** (e.g. a cheaper tier, a bigger disk, a new provider) with minimal downtime and **without losing
your access keys**. Follow it top to bottom.

> Standing up a **brand-new** deployment with no existing server? Use `SERVER-SETUP.md` instead — it
> builds everything from scratch and starts with no access keys.

---

## Why migrate-by-copy instead of just setting up fresh?

You *could* run a from-scratch setup on the new box. **You almost never should.** Of the three big
data pieces, two are regenerable and one is not:

| Data | Regenerable? | If you don't copy it |
| --- | --- | --- |
| `data/astrometry/` (index) | ✅ re-downloadable | ~15–30 min re-download |
| `data/local-catalog/celestial.sqlite` (catalog) | ✅ rebuildable | ~20–40 min rebuild (Gaia dominates) |
| **`data/astrosolve.sqlite` (access keys + analytics)** | ❌ **NOT regenerable** | **every access key stops working; all analytics history is lost** |

That last row is the whole point. `astrosolve.sqlite` holds the **SHA-256 hashes** of your users' API
keys and the `solve_events` history. A from-scratch server starts it empty, so **every caller would be
locked out** until you issued new keys *and* each user updated their stored key. Copying the file
preserves auth and history intact. Copying the catalog too is a nice bonus (skips the 20–40 min
rebuild) — but preserving the keys is the reason this doc exists.

**Strategy:** build the new box fully and verify it **while the old box keeps serving traffic**. Only
flip DNS once the new box is proven. That gives a clean, near-zero-downtime cutover with an easy
rollback (the old box is still there).

---

## 0. Fill in these values (on your Mac)

**What:** set the variables this doc reuses.

```bash
export OLD_IP="<current server IP>"
export NEW_IP="<new server IP>"
export SSH_KEY="~/.ssh/<your server key>"   # authenticates to BOTH boxes as root
export DEPLOY_USER="deploy"
export APP_DIR="/opt/astrosolve"
```

**Why:** later steps reference both boxes; naming them once avoids mixing them up (copying the *wrong*
direction would be bad).

---

## 1. Provision the new Ubuntu server (any provider)

**What:** create the new VM — requirements only, no vendor-specific UI:

- **OS:** Ubuntu 24.04 LTS
- **Size:** ≥ 2 vCPU / 4 GB / ~40 GB disk (**4 vCPU / 8 GB recommended** — solving is CPU-bound).
- **Access:** root login via your SSH public key. **Add the same CI key** the deploy pipeline uses, so
  GitHub Actions can deploy to it later.
- **Inbound:** allow **TCP 22** and **TCP 80**. No 443 (Cloudflare terminates TLS).

**Why:** the box is just a Docker host, so the provider is interchangeable. Getting the CI key on the
box now saves a fix-up in step 6. Verify access before continuing:

```bash
ssh -i $SSH_KEY root@$NEW_IP "echo connected"
```

---

## 2. Copy the deploy scripts + bootstrap the new box

**What:** put the scripts on the new box and run the one-time bootstrap.

```bash
# from the repo root on your Mac:
ssh -i $SSH_KEY root@$NEW_IP "mkdir -p $APP_DIR/scripts"
scp -i $SSH_KEY \
  tools/astrosolve/server/scripts/deploy/*.sh \
  tools/astrosolve/server/scripts/data/init-astrometry-db.sh \
  root@$NEW_IP:$APP_DIR/scripts/

# then on the new box, as root:
ssh -i $SSH_KEY root@$NEW_IP
chmod +x $APP_DIR/scripts/*.sh
DEPLOY_USER='deploy' APP_DIR='/opt/astrosolve' /opt/astrosolve/scripts/1_server_init.sh
```

`1_server_init.sh` installs Docker, creates the `deploy` user, creates `data/{astrometry,local-catalog,
uploads}`, touches an empty `astrosolve.sqlite`, and **downloads the ~963 MB index files** (15–30 min).

**Why:** the `scp` must include `init-astrometry-db.sh` from `scripts/data/` — `1_server_init.sh`'s
pre-flight check aborts without it. Letting the bootstrap download the index is simplest; if you'd
rather skip the wait, you can `rsync` the old box's `data/astrometry/` instead (same idea as step 3).
The empty `astrosolve.sqlite` created here is a placeholder — **step 3 overwrites it** with your real
keys DB.

---

## 3. Copy the catalog + keys from the old box to the new box

**What:** transfer the two data files that matter: the 8.3 GB catalog (to skip the rebuild) and the
40 KB keys/analytics DB (to preserve auth + history). Pick **one** transfer method.

### Method A — box-to-box (faster; recommended)
Uses SSH **agent forwarding** so the old box can push directly to the new box without your key ever
touching the old box.

```bash
# on your Mac:
ssh-add $SSH_KEY                       # load your key into the agent
ssh -A -i $SSH_KEY root@$OLD_IP        # -A forwards the agent to the old box

# now ON the old box (env vars don't cross the SSH hop — set the destination here):
export NEW_IP="<new server IP>"

# GUARD: a copy sent to a wrong-but-reachable host exits 0 and looks like success, so
# confirm NEW_IP is set and is NOT this (old) box before copying. `hostname -I` lists
# this box's own IPs — NEW_IP must not be among them, or you'd copy old→old (a no-op).
test -n "$NEW_IP" && ! hostname -I | tr ' ' '\n' | grep -qx "$NEW_IP" \
  || { echo "ABORT: NEW_IP unset or points at THIS (old) box — that copy would no-op"; exit 1; }

# catalog: read-only, safe to copy while the app runs
rsync -avP /opt/astrosolve/data/local-catalog/celestial.sqlite \
  deploy@$NEW_IP:/opt/astrosolve/data/local-catalog/

# keys + analytics: take a consistent snapshot first, then copy (overwrites the placeholder)
docker stop astrosolve
rsync -avP /opt/astrosolve/data/astrosolve.sqlite \
  deploy@$NEW_IP:/opt/astrosolve/data/astrosolve.sqlite
docker start astrosolve
```

### Method B — through your Mac (simpler; no agent forwarding)
Pulls each file to your Mac, then pushes it up. Needs ~8.3 GB free locally.

```bash
# all from your Mac:
rsync -avP -e "ssh -i $SSH_KEY" root@$OLD_IP:/opt/astrosolve/data/local-catalog/celestial.sqlite /tmp/celestial.sqlite
rsync -avP -e "ssh -i $SSH_KEY" /tmp/celestial.sqlite deploy@$NEW_IP:/opt/astrosolve/data/local-catalog/
rsync -avP -e "ssh -i $SSH_KEY" root@$OLD_IP:/opt/astrosolve/data/astrosolve.sqlite /tmp/astrosolve.sqlite
rsync -avP -e "ssh -i $SSH_KEY" /tmp/astrosolve.sqlite deploy@$NEW_IP:/opt/astrosolve/data/astrosolve.sqlite
```

**Why:** `celestial.sqlite` is opened read-only by the app, so copying it live is safe. `astrosolve.sqlite`
is *written* on every solve, so Method A stops the container briefly for a clean snapshot (a few seconds
of old-box downtime — fine, since Cloudflare still points at it and traffic is light). Method A is faster
because the bytes go box-to-box over the provider's backbone; Method B routes them through your Mac
(~2× the transfer). The ~8.3 GB transferred is negligible against a typical monthly traffic allowance.

### Verify the copy actually landed (do NOT skip — this is where migrations silently fail)

**What:** from your Mac, compare the on-disk size of `astrosolve.sqlite` on both boxes. They must match.

```bash
# from your Mac — both numbers must be EQUAL and non-trivial
# (a fresh box's placeholder is only ~48 KB):
ssh -i $SSH_KEY deploy@$OLD_IP 'stat -c "%s  OLD" /opt/astrosolve/data/astrosolve.sqlite'
ssh -i $SSH_KEY deploy@$NEW_IP 'stat -c "%s  NEW" /opt/astrosolve/data/astrosolve.sqlite'
```

**Why:** `rsync` to a wrong-but-reachable host **exits 0** — a mistargeted copy is indistinguishable
from a real one by exit code alone. This size compare is the first unambiguous proof the bytes arrived.
If NEW is ~48 KB (or much smaller than OLD), the copy did **not** land — the box still has the empty
placeholder `1_server_init.sh` created. Re-check `NEW_IP` and re-run the copy before continuing. (The
definitive key-by-key check is step 6, once the container is running — this size check is the early
tripwire so you catch it here, not after cutover.)

---

## 4. Point the deploy pipeline at the new box

**What:** in GitHub → **Settings → Secrets and variables → Actions**, change the **`DEPLOY_HOST`**
secret to the **new** IP. Leave `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `APP_DIR`, and `ASTROSOLVE_ORIGIN`
unchanged. Then confirm the CI key is authorized on the new box:

```bash
ssh -i $SSH_KEY deploy@$NEW_IP 'cat ~/.ssh/authorized_keys'   # must contain the DEPLOY_SSH_KEY public half
# if missing:  ssh-copy-id -i <ci_key>.pub deploy@$NEW_IP
```

**Why:** the deploy job SSHes into `DEPLOY_HOST` as `deploy` using `DEPLOY_SSH_KEY`. Repointing it is the
only pipeline change needed — everything else (CORS origin, app dir, image build) is host-independent.
`1_server_init.sh` copies *root's* authorized keys to `deploy`, so if the box wasn't created with the CI
key you must add it, or the deploy's SSH will be refused.

---

## 5. Deploy to the new box

**What:** GitHub → **Actions → the release/deploy workflow → Run workflow** (`workflow_dispatch`), with
the current image tag.

**Why:** this pulls the image and starts the container on the new box. Because you already copied the
catalog and keys, it comes up **fully enriched with your existing keys working** — not catalog-less and
not empty. (This deploy also doubles as the "first deployment to the new server.")

---

## 6. Verify the new box against its raw IP (DNS still on the old box)

**What:** test the new box directly, before flipping DNS.

```bash
curl http://$NEW_IP/                                   # → {"status":"Astrosolve API is running"}
ssh -i $SSH_KEY deploy@$NEW_IP 'docker ps'             # astrosolve "Up", 80->3000
ssh -i $SSH_KEY deploy@$NEW_IP \
  'ls -lh /opt/astrosolve/data/local-catalog/celestial.sqlite /opt/astrosolve/data/astrosolve.sqlite'
```

Then run the **hard gate that guarantees your users can still authenticate** — a key-by-key diff of the
new box against the old box. Run it against the **raw `$NEW_IP`** (never a hostname or an ambient
`SERVER_IP` that might still point at the old box):

```bash
# from your Mac — these two lists MUST be identical (sort makes order irrelevant):
ssh -i $SSH_KEY deploy@$OLD_IP 'docker exec astrosolve node scripts/manage-keys.js list' | sort > /tmp/keys-old.txt
ssh -i $SSH_KEY deploy@$NEW_IP 'docker exec astrosolve node scripts/manage-keys.js list' | sort > /tmp/keys-new.txt
diff /tmp/keys-old.txt /tmp/keys-new.txt \
  && echo "✅ KEYS MATCH — safe to cut over" \
  || echo "❌ KEYS DIFFER — copy failed; DO NOT flip DNS; redo step 3"
```

**STOP if the diff is non-empty.** If the new box shows fewer keys (or none), the keys DB never copied —
flipping DNS now would lock out every user whose key is missing. Go back to step 3, confirm `NEW_IP`, and
re-copy. Only proceed to step 7 when the diff is clean.

**Why:** DNS still points at the old box, so users are unaffected while you test. This key diff is the
single most important check in the runbook — it is the only thing that *proves* `astrosolve.sqlite`
actually copied. An rsync to the wrong host exits 0 and leaves the new box with an empty placeholder,
which looks fine right up until real users hit `UNAUTHORIZED` after cutover. Run it against the raw
`$NEW_IP` specifically: verifying the *old* box by mistake is exactly how a broken copy slips through
(if `SERVER_IP` is floating around your shell, it may point at the old box — don't use it here). The
catalog-label check proves `celestial.sqlite` copied intact. Fix any problem now, with zero user impact.

---

## 7. Cut over (flip DNS)

**What:** in Cloudflare → **DNS**, edit the `api` A record's IPv4 to the **new** IP (keep it Proxied /
orange, SSL still **Full (strict)**).

**Why:** this is the actual switch — new requests now resolve to the new box. Because you verified in
step 6, the cutover is low-risk; and because the old box is still running, rollback is just flipping the
A record back. Confirm end-to-end through the domain:

```bash
curl https://api.<your-domain>/          # served by the new box now
```
Then run a real solve from your frontend.

---

## 8. Decommission the old box

**What:** once you're confident (give it a day), retire the old server.

```bash
# optional: keep the old box a day as a warm rollback target, then:
sudo /opt/astrosolve/scripts/5_teardown.sh   # on the OLD box, or just delete the VM in your provider's console
```

**Why:** keeping the old box briefly gives you an instant DNS-flip rollback if something surfaces under
real traffic. After that, tear it down (or delete the VM) so you stop paying for it. Your keys and
history now live on the new box, so nothing is lost.
