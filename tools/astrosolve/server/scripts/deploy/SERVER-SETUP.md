# Astrosolve Server Setup (from scratch)

This is the complete, self-contained runbook for standing up a **brand-new** Astrosolve backend on
a fresh Linux server — from an empty box to a live, catalog-enabled API. Follow it top to bottom.

> **Moving an existing server** to a new box instead? Use `MIGRATE-SERVER.md` — it copies your data
> (crucially, your access keys) instead of rebuilding from scratch. This doc always starts empty:
> it **downloads** the astrometry index and **rebuilds** the catalog, and it starts with **no access
> keys**.

**How the pieces fit (read this first):**
- The server is **any Ubuntu box** running Docker. Nothing here is tied to a specific VPS provider.
- **Cloudflare** sits in front of the API subdomain and terminates TLS, so the box only serves plain
  HTTP on port 80.
- **GitHub Actions** builds the Docker image, pushes it to GHCR, and deploys by SSHing into the box —
  a deploy is just "pull the new image, swap the container." Deploys are fast and **never** build the
  heavy data.
- The two large data sets live **on the server's disk**, never in the image:
  - `data/astrometry/` — Astrometry.net FITS index files (downloaded by the bootstrap script).
  - `data/local-catalog/celestial.sqlite` — the deep object catalog (built out-of-band on the server).
- `data/astrosolve.sqlite` holds your **access keys + solve analytics**. It is the only piece of real
  state. Schema changes apply automatically as idempotent `ALTER TABLE ADD COLUMN` on startup, and a
  deploy never touches this file — which is why keys survive deploys.

---

## 0. Fill in these values (on your Mac)

**What:** set shell variables the rest of the doc reuses.

```bash
export SERVER_IP="<new server public IP>"
export SSH_KEY="~/.ssh/<your server key>"   # private key that authenticates to the box as root
export DEPLOY_USER="deploy"
export APP_DIR="/opt/astrosolve"
```

**Why:** every later command references these, so setting them once avoids copy-paste mistakes and
keeps the runbook provider-agnostic (only the IP changes between hosts).

---

## 1. Provision an Ubuntu server (any provider)

**What:** create one Linux VM. There is no vendor-specific UI here — any host works as long as it
meets these requirements:

- **OS:** Ubuntu 24.04 LTS
- **Size:** ≥ 2 vCPU / 4 GB RAM / ~40 GB disk. **4 vCPU / 8 GB recommended** — plate solving is
  CPU-bound and the catalog build wants headroom.
- **Access:** root login via your SSH **public key** (add it during creation).
- **Firewall / inbound:** allow **TCP 22** (SSH) and **TCP 80** (HTTP). **Do not open 443** — Cloudflare
  terminates TLS and forwards plain HTTP to port 80.

**Why:** the app is a Docker container reachable over SSH, so the provider is interchangeable. The
disk budget matters because the astrometry indexes (~1 GB) plus the catalog (~8 GB incl. Gaia + R-tree)
plus the image and uploads land on this disk (~13–18 GB total). Port 443 stays closed because the box
never sees TLS — that is Cloudflare's job (step 8).

---

## 2. Verify SSH access

**What:** confirm you can reach the box before running anything on it.

```bash
ssh -i $SSH_KEY root@$SERVER_IP "echo connected"
```

**Why:** if this fails (usually a firewall or wrong key), you want to find out now — every remaining
step depends on it. Expect the output `connected`.

---

## 3. Copy the deploy scripts to the server

**What:** from the repo root on your Mac, copy the scripts the server needs into `/opt/astrosolve/scripts/`.

```bash
ssh -i $SSH_KEY root@$SERVER_IP "mkdir -p $APP_DIR/scripts"
scp -i $SSH_KEY \
  tools/astrosolve/server/scripts/deploy/*.sh \
  tools/astrosolve/server/scripts/data/init-astrometry-db.sh \
  root@$SERVER_IP:$APP_DIR/scripts/
```

**Why:** the bootstrap script (`1_server_init.sh`) runs `init-astrometry-db.sh` and **requires it in the
same directory** — its pre-flight check aborts if it's missing. That file lives in `scripts/data/`, not
`scripts/deploy/`, so the `scp` **must list it explicitly** (a common trap: copying only `deploy/*.sh`
makes the next step fail).

---

## 4. Bootstrap the server

**What:** SSH in as root and run the one-time bootstrap.

```bash
ssh -i $SSH_KEY root@$SERVER_IP
chmod +x $APP_DIR/scripts/*.sh
DEPLOY_USER='deploy' APP_DIR='/opt/astrosolve' /opt/astrosolve/scripts/1_server_init.sh
```

This does, in order: installs **Docker**; creates the non-root **`deploy` user** and copies root's SSH
authorized keys to it; creates `data/{astrometry,local-catalog,uploads}` and **touches an empty**
`data/astrosolve.sqlite`; then **downloads the ~963 MB astrometry index files** (15–30 min).

**Why:** the deploy user is what GitHub Actions SSHes in as (never root). The empty `astrosolve.sqlite`
is pre-created as a *file* so Docker bind-mounts it correctly (Docker would otherwise create a
*directory* at that path). The index download happens here — not in a deploy and not in the image —
because `solve-field` reads these files off local disk and they're too large to bake in. It does **not**
build the catalog; that's step 7.

---

## 5. Add GitHub Actions secrets & variables

**What:** in the GitHub repo → **Settings → Secrets and variables → Actions**, add:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `DEPLOY_HOST` | the server's public IP |
| Secret | `DEPLOY_USER` | `deploy` |
| Secret | `DEPLOY_SSH_KEY` | the **CI** private key (no passphrase) authorized on the box |
| Variable | `APP_DIR` | `/opt/astrosolve` |
| Variable | `ASTROSOLVE_ORIGIN` | the allowed CORS origin (your frontend's URL) |

**Why:** the deploy job SSHes into `DEPLOY_HOST` as `DEPLOY_USER` using `DEPLOY_SSH_KEY`, then runs the
container with `APP_DIR`'s data mounted and `ASTROSOLVE_ORIGIN` as the CORS allow-list. These live in
GitHub (not on the server) so the box carries no secrets or config files. Make sure the **public half**
of `DEPLOY_SSH_KEY` is in the box's `deploy` user `authorized_keys` — step 4 copies root's authorized
keys to `deploy`, so include the CI key among the box's keys at creation, or `ssh-copy-id` it now.

---

## 6. First deploy (image + container)

**What:** trigger the deploy workflow manually — GitHub → **Actions → the release/deploy workflow →
Run workflow** (`workflow_dispatch`), entering the current image tag (e.g. `1.0.0`).

The pipeline builds the backend image, pushes it to **GHCR**, SSHes into the box, `docker pull`s it, and
runs the container (host port 80 → container 3000, with `data/*` mounted and env applied).

**Why:** this is what first puts an image on the server. The API comes up **catalog-less** — it serves
solves, just without object-catalog labels — because the catalog doesn't exist yet. That's intentional
(graceful degradation), and it's what makes the ordering in step 7 possible.

---

## 7. Build the local catalog (out-of-band)

**What:** on the server as the `deploy` user, build the catalog **after** the first deploy, then restart
the API to pick it up.

```bash
/opt/astrosolve/scripts/rebuild-catalog.sh     # detached, resumable — full build ~20–40 min (Gaia dominates)
docker logs -f catalog-build                   # watch; safe to Ctrl-C / disconnect — the build keeps running
# once it prints "R-tree spatial index built (...)":
docker restart astrosolve
```

**Why the order matters:** `rebuild-catalog.sh` runs the build **inside the astrosolve image**, so it
**cannot** run before the first deploy — with no image on the box it hard-exits with *"No astrosolve
image found locally."* The build is detached so an SSH drop can't kill it, and resumable so re-running
skips already-loaded sources. The `docker restart` is how the running container reopens the freshly
written `celestial.sqlite` on a clean connection.

---

## 8. Point Cloudflare at the server (do this last)

**What:** in Cloudflare for your domain:

1. **DNS → Add record:** type `A`, name `api`, IPv4 = your `SERVER_IP`, **Proxy status: Proxied** (orange cloud).
2. **SSL/TLS → Overview:** set encryption mode to **Full (strict)**.

**Why last:** flipping DNS is what sends real users to this box. Doing it *after* the catalog build
(step 7) guarantees the first visitors never hit a catalog-less or still-booting server. Cloudflare
terminates public TLS and forwards plain HTTP to port 80 (which is why the box needs no 443 and no
certificate); **Full (strict)** keeps the Cloudflare↔origin hop verified.

---

## 9. Smoke test & verify

**What:** confirm the live endpoint and the on-disk data.

```bash
# from anywhere:
curl https://api.<your-domain>/          # → {"status":"Astrosolve API is running"}

# on the server:
df -h
du -sh $APP_DIR/data/astrometry $APP_DIR/data/local-catalog
ls -lh $APP_DIR/data/local-catalog/celestial.sqlite
```

Then run a real solve of a known field (e.g. M31) from your frontend and confirm you get a WCS result
**with** catalog object labels.

**Why:** the `curl` proves Cloudflare → origin → app works end-to-end; the `du`/`ls` prove the index
(~1 GB) and catalog (~8 GB) are present; the real solve proves the catalog is actually queryable, not
just present on disk.

---

## 10. Create your first access key

**What:** on the server, issue a key (the API rejects solves without one when auth is enabled).

```bash
docker exec -it astrosolve node scripts/manage-keys.js add <username>   # prints the plain key ONCE
docker exec -it astrosolve node scripts/manage-keys.js list             # shows status, not the keys
```

**Why:** a from-scratch server starts with an **empty** `astrosolve.sqlite`, so there are no keys yet.
The plain key is shown only once (only its SHA-256 hash is stored — a leaked DB can't yield working
keys), so store it immediately. Give the key to whoever calls `/api/v1/solve` via the `x-access-key`
header. Use `rotate <username>` to reissue without losing that user's analytics history.

---

## Day-2 operations

**Deploy a new version / roll back** — GitHub → **Actions → Run workflow**, entering the desired image
tag (a newer tag to upgrade, a previous good tag to roll back). *Why:* rollouts and rollbacks are just
"pull that tag, swap the container"; there is no deploy script and the catalog is never rebuilt, so
these are fast and safe.

**Restart the container** (no image pull):
```bash
/opt/astrosolve/scripts/3_restart.sh   # or: docker restart astrosolve
```
*Why:* use it to recover a wedged container or to make the API reopen the catalog after a manual rebuild.

**Stop the container** (data preserved):
```bash
/opt/astrosolve/scripts/4_stop.sh
```
*Why:* stops/removes the container but keeps the mounted `data/`; resume by triggering a deploy.

**View logs:**
```bash
docker logs -f astrosolve
```

**Refresh the catalog later** — re-run `rebuild-catalog.sh` (resumable; skips already-loaded sources),
then `docker restart astrosolve`. *Why:* picks up new/changed catalog sources without a full re-download.

**Full teardown (DESTRUCTIVE):**
```bash
sudo /opt/astrosolve/scripts/5_teardown.sh
```
*Why:* returns the box to a clean state — **including all data**. Back up `astrosolve.sqlite` (your
keys + analytics) first if you might want it; the index and catalog are regenerable, but the keys are not.

---

## Operational rules (why the design is shaped this way)

- **Runtime config lives in GitHub Actions variables**, not on the server — the box holds no `.env`.
- **Index files and the catalog live only on the server**, never in the image — they're large and
  regenerable, so baking them in would bloat every deploy for no benefit.
- **The catalog is built out-of-band** (`rebuild-catalog.sh`, detached) and mounted read-only; deploys
  never build it, so deploys stay to a few seconds.
- **`astrosolve.sqlite` (access keys + analytics) is the only real state.** Schema changes apply as
  idempotent `ALTER TABLE ADD COLUMN` on startup — so upgrades need no manual schema step — and a deploy
  never touches this file. That's exactly why keys survive deploys, but a from-scratch rebuild (this doc)
  starts with none.
