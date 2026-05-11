# Astrosolve Hetzner Deploy Runbook

This runbook sets up the production Astrosolve backend on a Hetzner Ubuntu server.

Production design:

- GitHub Pages hosts the frontend
- Hetzner hosts the Astrosolve backend
- Cloudflare fronts the API subdomain (handles TLS termination — no reverse proxy on the server)
- Docker maps host port 80 directly to the container port 3000
- Astrometry index files live on the server, not in the Docker image
- SQLite catalog data lives in the repo/image under `data/local-catalog`
- Runtime data is grouped under a single `/opt/astrosolve/data` hierarchy
- Merging the release PR deploys both frontend and backend

---

## Script Reference

| Script               | When to run       | As     | Description                                                         |
| -------------------- | ----------------- | ------ | ------------------------------------------------------------------- |
| `1_server_init.sh`   | Once (setup)      | root   | Full bootstrap: Docker, user, directories, config, compose          |
| `1a_init_docker.sh`  | Called by init    | —      | Docker Engine install helper (sourced by `1_server_init.sh`)        |
| `1b_init_compose.sh` | Called by init    | —      | compose.yaml generator (sourced by `1_server_init.sh`)              |
| `2_deploy.sh`        | Every release     | deploy | Pull image tag and start containers                                 |
| `3_restart.sh`       | On-demand         | deploy | Restart containers without pulling a new image                      |
| `4_stop.sh`          | On-demand         | deploy | Gracefully stop containers (data preserved)                         |
| `5_teardown.sh`      | Decommission only | root   | **DESTRUCTIVE** — removes everything, returns server to clean state |

---

## 0. Fill These Values First

Run these locally on your Mac before you start:

```bash
export SERVER_IP="YOUR_HETZNER_SERVER_IP"
export DEPLOY_USER="deploy"
export API_DOMAIN="api.YOURDOMAIN.com"
export UI_ORIGIN="https://YOURDOMAIN.com"
export GHCR_IMAGE="ghcr.io/YOUR_GITHUB_OWNER/db-astro-suite-astrosolve"
```

## 1. Copy The Scripts To The Server

From your Mac:

```bash
ssh root@$SERVER_IP "mkdir -p /root/astrosolve-deploy"
scp \
  tools/astrosolve/server/scripts/deploy/1_server_init.sh \
  tools/astrosolve/server/scripts/deploy/1a_init_docker.sh \
  tools/astrosolve/server/scripts/deploy/1b_init_compose.sh \
  tools/astrosolve/server/scripts/deploy/2_deploy.sh \
  tools/astrosolve/server/scripts/deploy/3_restart.sh \
  tools/astrosolve/server/scripts/deploy/4_stop.sh \
  tools/astrosolve/server/scripts/deploy/5_teardown.sh \
  root@$SERVER_IP:/root/astrosolve-deploy/
```

## 2. SSH Into The Server As Root

```bash
ssh root@$SERVER_IP
```

If you use a custom key:

```bash
ssh -i ~/.ssh/YOUR_KEY_FILE root@$SERVER_IP
```

## 3. Run The Bootstrap Script

On the server:

```bash
chmod +x /root/astrosolve-deploy/*.sh
API_DOMAIN="$API_DOMAIN" UI_ORIGIN="$UI_ORIGIN" GHCR_IMAGE="$GHCR_IMAGE" DEPLOY_USER="$DEPLOY_USER" /root/astrosolve-deploy/1_server_init.sh
```

This does the following:

- installs Docker Engine and the Compose plugin (via `1a_init_docker.sh`)
- creates the deploy user and copies root's SSH authorized keys to it
- creates `/opt/astrosolve` with subdirectories: `data/astrometry`, `data/uploads`, `scripts`
- writes `/opt/astrosolve/.env` with your runtime configuration
- generates `/opt/astrosolve/compose.yaml` (via `1b_init_compose.sh`)
- installs `2_deploy.sh`, `3_restart.sh`, and `4_stop.sh` into `/opt/astrosolve/scripts`
- validates the Compose file with a dry-run

## 4. Reconnect As The Deploy User

From your Mac:

```bash
ssh $DEPLOY_USER@$SERVER_IP
```

Verify Docker access:

```bash
docker --version
docker compose version
```

## 5. Copy Or Download The Astrometry Index Files

These files must stay on the server and must not be copied into the image.

### Option A: Copy pre-downloaded indexes from your Mac

From your Mac:

```bash
scp -r /path/to/local/astrometry/* $DEPLOY_USER@$SERVER_IP:/opt/astrosolve/data/astrometry/
```

### Option B: Copy the downloader script and run it on the server

From your Mac:

```bash
scp tools/astrosolve/server/scripts/data/init-astrometry-db.sh \
  $DEPLOY_USER@$SERVER_IP:/opt/astrosolve/scripts/init-astrometry-db.sh
```

On the server:

```bash
chmod +x /opt/astrosolve/scripts/init-astrometry-db.sh
bash /opt/astrosolve/scripts/init-astrometry-db.sh /opt/astrosolve/data/astrometry
```

Verify indexes:

```bash
ls -lh /opt/astrosolve/data/astrometry | head
du -sh /opt/astrosolve/data/astrometry
```

## 6. Generate The SQLite Catalog For The Image

Generate the catalog locally so it can be committed and baked into the backend image.

On your Mac, from the repo root:

```bash
cd tools/astrosolve/server
npm install
npm run init-local-catalog-db
```

Verify:

```bash
ls -lh tools/astrosolve/server/data/local-catalog/celestial.sqlite
```

If you want this catalog version included in production, commit it before merging the release PR.

## 7. Configure Cloudflare

In Cloudflare:

- create an `A` record for `api` pointing to the server IP
- enable the proxy for that record
- set SSL mode to `Full (strict)`

No shell command is needed for this step.

## 8. First Manual Backend Deployment

Once the GitHub Actions backend image exists in GHCR, deploy it manually once.

On the server, with credentials (needed the first time to authenticate Docker to GHCR):

```bash
GHCR_USERNAME="YOUR_GITHUB_OWNER" GHCR_TOKEN="YOUR_GITHUB_PAT_OR_TEMP_TOKEN" /opt/astrosolve/scripts/2_deploy.sh YOUR_IMAGE_TAG
```

If you already authenticated Docker to GHCR on the server, you can omit the credentials:

```bash
/opt/astrosolve/scripts/2_deploy.sh YOUR_IMAGE_TAG
```

`2_deploy.sh` is the stable operator and CI entrypoint. It stops any running containers, pulls the requested image tag, starts the container in detached mode, and prunes old images.

Verify containers:

```bash
docker compose --env-file /opt/astrosolve/.env -f /opt/astrosolve/compose.yaml ps
```

## 9. Smoke Test The API

On the server:

```bash
curl http://localhost
curl https://$API_DOMAIN/
```

From your Mac:

```bash
curl https://$API_DOMAIN/
```

Expected response:

```json
{ "status": "Astrosolve API is running" }
```

## 10. Verify Disk Headroom

On the server:

```bash
df -h
du -sh /opt/astrosolve/data/astrometry
du -sh /opt/astrosolve/data/uploads
```

## 11. GitHub Actions Secrets Needed Later

Add these repository secrets:

- `HETZNER_HOST`
- `HETZNER_USER`
- `HETZNER_SSH_KEY`

The release workflow will SSH into the server and run:

```bash
GHCR_USERNAME="YOUR_GITHUB_OWNER" GHCR_TOKEN="${GITHUB_TOKEN_FROM_ACTION}" /opt/astrosolve/scripts/2_deploy.sh <release-version>
```

## 12. Rollback

On the server:

```bash
/opt/astrosolve/scripts/2_deploy.sh PREVIOUS_GOOD_TAG
```

## 13. Day-2 Operations

### Restart (no image pull)

Use when the container is misbehaving, enters an unhealthy state, or you updated `.env` and need the container to pick up the new values without deploying a new image:

```bash
/opt/astrosolve/scripts/3_restart.sh
```

### Stop

Gracefully stops and removes all containers. Docker images and persistent data (`data/astrometry`, `data/uploads`) are preserved:

```bash
/opt/astrosolve/scripts/4_stop.sh
```

To resume after a stop, use `3_restart.sh` (existing image) or `2_deploy.sh` (new image).

## 14. Full Teardown (DESTRUCTIVE)

Returns the server to a clean state. Run as root. The script prompts for confirmation before proceeding.

```bash
sudo /root/astrosolve-deploy/5_teardown.sh
```

This permanently deletes:

- all Docker containers, images, and volumes
- `/opt/astrosolve` and all data within it (astrometry indexes, uploads)
- the deploy user and their home directory
- Docker Engine and related packages
- Docker's apt repository and GPG key

**Back up any data you need before running this.**

## 15. Verify Locally With Multipass (Ubuntu VM)

Use [Multipass](https://multipass.run) to spin up a lightweight Ubuntu VM on your Mac and dry-run the scripts before touching the real server. Multipass creates real Ubuntu VMs with no nested-Docker complexity.

### Install Multipass

```bash
brew install --cask multipass
```

### Launch A VM

```bash
multipass launch --name astrosolve-test --cpus 2 --memory 2G --disk 20G
```

### Transfer Scripts Into The VM

From your Mac, at the repo root:

```bash
multipass exec astrosolve-test -- mkdir -p /home/ubuntu/astrosolve-deploy
multipass transfer \
  tools/astrosolve/server/scripts/deploy/1_server_init.sh \
  tools/astrosolve/server/scripts/deploy/1a_init_docker.sh \
  tools/astrosolve/server/scripts/deploy/1b_init_compose.sh \
  tools/astrosolve/server/scripts/deploy/2_deploy.sh \
  tools/astrosolve/server/scripts/deploy/3_restart.sh \
  tools/astrosolve/server/scripts/deploy/4_stop.sh \
  tools/astrosolve/server/scripts/deploy/5_teardown.sh \
  astrosolve-test:/home/ubuntu/astrosolve-deploy/
```

### Run Init Inside The VM

```bash
multipass shell astrosolve-test

# Inside the VM:
sudo bash
chmod +x /home/ubuntu/astrosolve-deploy/*.sh
API_DOMAIN="api.test.local" \
UI_ORIGIN="http://localhost" \
GHCR_IMAGE="ghcr.io/YOUR_GITHUB_OWNER/db-astro-suite-astrosolve" \
DEPLOY_USER="deploy" \
/home/ubuntu/astrosolve-deploy/1_server_init.sh
```

Verify the output — all steps should complete without errors. Confirm key artifacts were written:

```bash
cat /opt/astrosolve/.env
cat /opt/astrosolve/compose.yaml
id deploy
ls /opt/astrosolve/scripts/
```

### Test Deploy

The deploy step requires a real image in GHCR. Provide your credentials:

```bash
GHCR_USERNAME="YOUR_GITHUB_OWNER" \
GHCR_TOKEN="YOUR_GITHUB_PAT" \
/opt/astrosolve/scripts/2_deploy.sh <image-tag>
```

### Test Restart And Stop

```bash
/opt/astrosolve/scripts/3_restart.sh
/opt/astrosolve/scripts/4_stop.sh
```

### Clean Up The VM

When done, from your Mac:

```bash
multipass stop astrosolve-test
multipass delete astrosolve-test
multipass purge
```

## 16. Operational Rules

- Do not store astrometry indexes in the production image
- Do commit `data/local-catalog/celestial.sqlite` when you intentionally update the local catalog
- Do not rely on container-local data for astrometry indexes
- Normal commits to `main` should update the release PR and should not deploy
- Merging the generated release PR should deploy both frontend and backend
