# Astrosolve Deploy Runbook

This runbook sets up the production Astrosolve backend on a remote Ubuntu server.

> To dry-run the scripts locally in a VM before touching the real server, see [local-test.md](local-test.md).

Production design:

- GitHub Pages hosts the frontend
- A remote VPS hosts the Astrosolve backend
- Cloudflare fronts the API subdomain (handles TLS termination — no reverse proxy on the server)
- Docker maps host port 80 directly to the container port 3000
- Astrometry index files live on the server, mounted read-only into the container
- All runtime config (CORS origin, app dir) lives in GitHub Actions variables — no `.env` file on the server
- Merging the release PR deploys both frontend and backend

---

## Script Reference

| Script              | When to run       | As     | Description                                                         |
| ------------------- | ----------------- | ------ | ------------------------------------------------------------------- |
| `1_server_init.sh`   | Once (setup)      | root   | Bootstrap: Docker, deploy user, data directories, astrometry files  |
| `1a_init_docker.sh`  | Called by init    | —      | Docker Engine install helper (sourced by `1_server_init.sh`)        |
| `rebuild-catalog.sh` | Setup + refresh   | deploy | Build/refresh the local celestial catalog, **detached** (see §3a)   |
| `3_restart.sh`       | On-demand         | deploy | Restart the container without pulling a new image                   |
| `4_stop.sh`          | On-demand         | deploy | Gracefully stop the container (data preserved)                      |
| `5_teardown.sh`      | Decommission only | root   | **DESTRUCTIVE** — removes everything, returns server to clean state |

> **Upgrading an existing deployment?** A normal deploy is self-contained — the
> pipeline pulls the image and swaps the container (it does **not** touch the
> catalog). Refresh the catalog out-of-band when you want to (§3a). Any release
> that ever needs an extra manual step will document it as a numbered file in
> [`migrations/`](./migrations/); apply every migration newer than your
> currently-running version, in ascending order.

---

## 0. Fill These Values First

Run these locally on your Mac before you start:

```bash
export SERVER_IP="<SERVER-IP>"
export SSH_KEY="~/.ssh/db_astro_suite"
export DEPLOY_USER="deploy"
export APP_DIR="/opt/astrosolve"
```

## 1. Copy The Scripts To The Server

From your Mac, at the repo root. Copies **all** deploy scripts so the server
always has the latest set:

```bash
ssh -i $SSH_KEY root@$SERVER_IP "mkdir -p /root/astrosolve-deploy"
scp -i $SSH_KEY \
  tools/astrosolve/server/scripts/deploy/*.sh \
  tools/astrosolve/server/scripts/data/init-astrometry-db.sh \
  root@$SERVER_IP:/root/astrosolve-deploy/
```

## 2. SSH Into The Server As Root

```bash
ssh -i $SSH_KEY root@$SERVER_IP
```

## 3. Run The Bootstrap Script

On the server:

```bash
chmod +x /root/astrosolve-deploy/*.sh
DEPLOY_USER='$DEPLOY_USER' \
APP_DIR='$APP_DIR' \
/root/astrosolve-deploy/1_server_init.sh
```

This does the following:

- Installs Docker Engine (via `1a_init_docker.sh`)
- Creates the deploy user and copies root's SSH authorized keys to it
- Creates `$APP_DIR` with subdirectories: `data/astrometry`, `data/local-catalog`, `data/uploads`
- Pre-creates `data/astrosolve.sqlite` (access keys database, persisted across deploys)
- **Downloads Astrometry.net index files** into `data/astrometry` — takes 15–30 min on first run; subsequent runs skip files already present

It does **not** build the local celestial catalog — that is a separate,
out-of-band step (see §3a). **Deploys never build the catalog.**

## 3a. Build The Local Celestial Catalog (out-of-band)

`data/local-catalog/celestial.sqlite` is the deep object catalog (OpenNGC +
HyperLEDA galaxies + Milliquas quasars + faint nebulae/clusters + Gaia DR3
G≤15 stars + R-tree spatial index). Like the astrometry indexes it lives only
on the server's disk and is **never** baked into the image.

**Deploys do not build it.** Building it is slow (a full R-tree rebuild over
~38M rows), so it is kept off the deploy path — deploys just pull the image and
swap the container (~seconds). You build the catalog with a dedicated **detached**
helper, so an SSH disconnect can't interrupt it:

```bash
# On the server. Run once for first-time setup, and again whenever you want to
# refresh the catalog. Needs an image already pulled — the first deploy does
# that (the API runs catalog-less until this first build completes).
/root/astrosolve-deploy/rebuild-catalog.sh            # resumable build
/root/astrosolve-deploy/rebuild-catalog.sh --rebuild  # force a clean rebuild
```

Then watch it, and restart the API to pick up the new catalog:

```bash
docker logs -f catalog-build           # safe to Ctrl-C / disconnect — build continues
# when it prints "R-tree spatial index built (...)":
docker restart astrosolve
```

Notes:

- The build is **resumable** — re-running skips already-loaded sources; a source
  that keeps failing is logged and skipped rather than aborting the build.
- It runs **detached** (`docker run -d`), so it survives an SSH drop. The first
  full build downloads everything (Gaia dominates — ~20–40 min).
- The `docker restart astrosolve` above is how the running API picks up a freshly
  (re)built catalog. On a refresh of a live server the API's catalog lookups may
  briefly error during the R-tree step — stop the API first if you want zero blips.

## 4. Reconnect As The Deploy User

From your Mac:

```bash
ssh -i $SSH_KEY $DEPLOY_USER@$SERVER_IP
```

Verify Docker access:

```bash
docker --version
```

## 5. Configure Cloudflare

In Cloudflare:

- Create an `A` record for `api` pointing to the server IP
- Enable the proxy for that record (orange cloud)
- Set SSL mode to **Full (strict)**

## 6. Add GitHub Actions Secrets And Variables

Go to your GitHub repository → **Settings → Secrets and variables → Actions**.

**Secrets tab:**

| Secret name      | Value                                           |
| ---------------- | ----------------------------------------------- |
| `DEPLOY_HOST`    | Your server's public IP                         |
| `DEPLOY_USER`    | The deploy username (e.g. `deploy`)             |
| `DEPLOY_SSH_KEY` | Contents of your CI private key (no passphrase) |

To print the private key:

```bash
cat ~/.ssh/db_astro_suite_ci
```

## 7. Trigger The First Deploy

Go to your GitHub repository → **Actions → test-release-deploy → Run workflow**.

Enter an image tag (e.g. `1.0.0`) and click **Run workflow**.

The pipeline will:

1. Build the backend Docker image and push it to GHCR
2. SSH into the server, pull the image, and swap the API container — **a fast
   pull + container swap (~seconds)**. The deploy does **not** build the catalog.

> On a brand-new server the API comes up **catalog-less** after this first deploy
> (it serves, just without catalog labels). Build the catalog next with §3a's
> `rebuild-catalog.sh`, then restart the API. Subsequent deploys never touch the
> catalog, so they stay fast.

## 8. Smoke Test The API

```bash
curl https://api.dbastrosuite.com/
```

Expected response:

```json
{ "status": "Astrosolve API is running" }
```

## 9. Verify Data Directories

On the server:

```bash
df -h
du -sh $APP_DIR/data/astrometry
du -sh $APP_DIR/data/local-catalog
ls -lh $APP_DIR/data/local-catalog/celestial.sqlite
du -sh $APP_DIR/data/uploads
ls -lh $APP_DIR/data/astrosolve.sqlite
```

---

## Day-2 Operations

### Restart (no image pull)

Use when the container is misbehaving or you need a clean restart:

```bash
/root/astrosolve-deploy/3_restart.sh
```

Or directly:

```bash
docker restart astrosolve
```

### Stop

Gracefully stops and removes the container. Data volumes are preserved:

```bash
/root/astrosolve-deploy/4_stop.sh
```

To resume, trigger a deploy from GitHub Actions.

### View Logs

```bash
docker logs astrosolve
docker logs -f astrosolve   # follow live
```

### Rollback

Trigger a deploy from GitHub Actions using the previous good image tag.

---

## Full Teardown (DESTRUCTIVE)

Returns the server to a clean state. Run as root:

```bash
sudo /root/astrosolve-deploy/5_teardown.sh
```

**Back up any data you need before running this.**

---

## Operational Rules

- Runtime config (CORS origin, app dir) lives in GitHub Actions variables — not on the server
- The astrometry index files are large and live only on the server — never in the Docker image
- The local celestial catalog (`local-catalog/celestial.sqlite`, ~8 GB) is built **out-of-band** on the server via `rebuild-catalog.sh` (detached), mounted read-only, and **never** built by a deploy or baked into the image (see §3a). Deploys just pull + swap the container; restart the API after a (re)build to pick up the new catalog
- The access keys database (`astrosolve.sqlite`) is volume-mounted and survives image updates
- Normal commits to `main` do not deploy — only release PR merges and `workflow_dispatch` triggers
