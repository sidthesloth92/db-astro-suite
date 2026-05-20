# Astrosolve Deploy Runbook

This runbook sets up the production Astrosolve backend on a remote Ubuntu server.

> To dry-run the scripts locally in a VM before touching the real server, see [local-test.md](local-test.md).

Production design:

- GitHub Pages hosts the frontend
- A remote VPS hosts the Astrosolve backend
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
export SERVER_IP="<SERVER-IP>"
export SSH_KEY="~/.ssh/db_astro_suite"
export DEPLOY_USER="deploy"
export APP_DIR="/opt/astrosolve"
export API_DOMAIN="api.dbastrosuite.com"
export ASTROSOLVE_ORIGIN="https://dbastrosuite.com"
export GHCR_IMAGE="ghcr.io/sidthesloth92/db-astro-suite-astrosolve"
```

## 1. Copy The Scripts To The Server

From your Mac:

```bash
ssh -i $SSH_KEY root@$SERVER_IP "mkdir -p /root/astrosolve-deploy"
scp -i $SSH_KEY \
  tools/astrosolve/server/scripts/deploy/1_server_init.sh \
  tools/astrosolve/server/scripts/deploy/1a_init_docker.sh \
  tools/astrosolve/server/scripts/deploy/1b_init_compose.sh \
  tools/astrosolve/server/scripts/deploy/2_deploy.sh \
  tools/astrosolve/server/scripts/deploy/3_restart.sh \
  tools/astrosolve/server/scripts/deploy/4_stop.sh \
  tools/astrosolve/server/scripts/deploy/5_teardown.sh \
  tools/astrosolve/server/scripts/data/init-astrometry-db.sh \
  root@$SERVER_IP:/root/astrosolve-deploy/
```

## 2. SSH Into The Server As Root

Only needed for interactive debugging. Step 3 runs the bootstrap entirely from your Mac — you do not need to SSH in first.

```bash
ssh -i $SSH_KEY root@$SERVER_IP
```

## 3. Run The Bootstrap Script

From your Mac. The variables exported in Step 0 expand on your Mac before being sent to the server:

```bash
ssh -i $SSH_KEY root@$SERVER_IP \
  "chmod +x /root/astrosolve-deploy/*.sh && \
   API_DOMAIN='$API_DOMAIN' \
   ASTROSOLVE_ORIGIN='$ASTROSOLVE_ORIGIN' \
   GHCR_IMAGE='$GHCR_IMAGE' \
   DEPLOY_USER='$DEPLOY_USER' \
   APP_DIR='$APP_DIR' \
   /root/astrosolve-deploy/1_server_init.sh"
```

This does the following:

- installs Docker Engine and the Compose plugin (via `1a_init_docker.sh`)
- creates the deploy user and copies root's SSH authorized keys to it
- creates `/opt/astrosolve` with subdirectories: `data/astrometry`, `data/uploads`, `scripts`
- writes `/opt/astrosolve/.env` with your runtime configuration
- generates `/opt/astrosolve/compose.yaml` (via `1b_init_compose.sh`)
- **downloads Astrometry.net index files** into `/opt/astrosolve/data/astrometry` (via `init-astrometry-db.sh`) — takes 15–30 min on first run; subsequent runs skip files already present
- installs `2_deploy.sh`, `3_restart.sh`, and `4_stop.sh` into `/opt/astrosolve/scripts`
- validates the Compose file with a dry-run

## 4. Reconnect As The Deploy User

From your Mac:

```bash
ssh -i $SSH_KEY $DEPLOY_USER@$SERVER_IP
```

Verify Docker access:

```bash
docker --version
docker compose version
```

## 5. Update Astrometry Index Files

Index files are downloaded automatically during `1_server_init.sh`. You only need this section if you want to add a new index family later or reseed after data loss.

SSH into the server as the deploy user, then:

```bash
bash /opt/astrosolve/scripts/init-astrometry-db.sh /opt/astrosolve/data/astrometry
```

The script is idempotent — it skips files that already exist.

Verify:

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

## 8. Merge The Release PR

With the server set up and Cloudflare configured, merge the release PR on GitHub. The pipeline will:

1. Build the backend Docker image and push it to GHCR
2. SSH into the server and run `2_deploy.sh <version>` automatically
3. Build and deploy the frontend to GitHub Pages

Verify containers are running after the pipeline completes:

```bash
ssh -i $SSH_KEY $DEPLOY_USER@$SERVER_IP \
  "docker compose --env-file /opt/astrosolve/.env -f /opt/astrosolve/compose.yaml ps"
```

> **If the pipeline deploy fails on the first merge** (e.g. timing issue), you can trigger it manually:
>
> ```bash
> ssh -i $SSH_KEY $DEPLOY_USER@$SERVER_IP \
>   "GHCR_USERNAME='sidthesloth92' GHCR_TOKEN='YOUR_PAT' /opt/astrosolve/scripts/2_deploy.sh YOUR_IMAGE_TAG"
> ```

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

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`

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

## 15. Operational Rules

- Do not store astrometry indexes in the production image
- Do commit `data/local-catalog/celestial.sqlite` when you intentionally update the local catalog
- Do not rely on container-local data for astrometry indexes
- Normal commits to `main` should update the release PR and should not deploy
- Merging the generated release PR should deploy both frontend and backend
