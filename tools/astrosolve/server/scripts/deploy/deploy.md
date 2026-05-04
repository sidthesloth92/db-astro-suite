# Astrosolve Hetzner Deploy Runbook

This runbook sets up the production Astrosolve backend on a Hetzner Ubuntu server.

Production design:

- GitHub Pages hosts the frontend
- Hetzner hosts the Astrosolve backend
- Cloudflare fronts the API subdomain
- Astrometry index files live on the server, not in the Docker image
- SQLite catalog data lives in the repo/image under `data/local-catalog`
- Runtime data is grouped under a single `/opt/astrosolve/data` hierarchy
- Merging the release PR deploys both frontend and backend

## 0. Fill These Values First

Run these locally on your Mac before you start:

```bash
export SERVER_IP="YOUR_HETZNER_SERVER_IP"
export DEPLOY_USER="deploy"
export API_DOMAIN="api.YOURDOMAIN.com"
export UI_ORIGIN="https://YOURDOMAIN.com"
export GHCR_IMAGE="ghcr.io/YOUR_GITHUB_OWNER/db-astro-suite-astrosolve"
```

## 1. Copy The Bootstrap Script To The Server

From your Mac:

```bash
ssh root@$SERVER_IP "mkdir -p /root/astrosolve-deploy"
scp tools/astrosolve/server/scripts/deploy/server_init.sh \
	tools/astrosolve/server/scripts/deploy/server_update.sh \
	tools/astrosolve/server/scripts/deploy/server_deploy.sh \
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
API_DOMAIN="$API_DOMAIN" UI_ORIGIN="$UI_ORIGIN" GHCR_IMAGE="$GHCR_IMAGE" DEPLOY_USER="$DEPLOY_USER" /root/astrosolve-deploy/server_init.sh
```

This does the following:

- installs Docker and the Compose plugin
- creates the deploy user
- creates `/opt/astrosolve`
- writes `.env`, `compose.yaml`, and `Caddyfile`
- installs `server_update.sh` and `server_deploy.sh` into `/opt/astrosolve/scripts`
- validates the Compose file

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
scp -r /Users/dineshbalajiv/DB/projects/db-astro-suite/tools/astrosolve/server/data/astrometry/* $DEPLOY_USER@$SERVER_IP:/opt/astrosolve/data/astrometry/
```

### Option B: Copy the downloader script and run it on the server

From your Mac:

```bash
scp /Users/dineshbalajiv/DB/projects/db-astro-suite/tools/astrosolve/server/scripts/data/init-astrometry-db.sh $DEPLOY_USER@$SERVER_IP:/opt/astrosolve/scripts/init-astrometry-db.sh
```

On the server:

```bash
chmod +x /opt/astrosolve/scripts/init-astrometry-db.sh
cd /opt/astrosolve/data/astrometry
bash /opt/astrosolve/scripts/init-astrometry-db.sh /opt/astrosolve/data/astrometry
```

Verify indexes:

```bash
ls -lh /opt/astrosolve/data/astrometry | head
du -sh /opt/astrosolve/data/astrometry
```

## 6. Generate The SQLite Catalog For The Image

Generate the catalog locally so it can be committed and baked into the backend image.

On your Mac:

```bash
cd /Users/dineshbalajiv/DB/projects/db-astro-suite/tools/astrosolve/server
npm install
npm run init-local-catalog-db
```

This writes the file here:

```bash
ls -lh /Users/dineshbalajiv/DB/projects/db-astro-suite/tools/astrosolve/server/data/local-catalog/celestial.sqlite
```

If you want this catalog version included in production, commit it before merging the release PR.

Verify it locally:

```bash
ls -lh /Users/dineshbalajiv/DB/projects/db-astro-suite/tools/astrosolve/server/data/local-catalog/celestial.sqlite
```

## 7. Configure Cloudflare

In Cloudflare:

- create `api` record pointing to the server IP
- enable the proxy for that record
- set SSL mode to `Full (strict)`

No shell command is needed for this step.

## 8. First Manual Backend Deployment

Once the GitHub Actions backend image exists in GHCR, deploy it manually once.

On the server:

```bash
GHCR_USERNAME="YOUR_GITHUB_OWNER" GHCR_TOKEN="YOUR_GITHUB_PAT_OR_TEMP_TOKEN" /opt/astrosolve/scripts/server_deploy.sh YOUR_IMAGE_TAG
```

If you already authenticated Docker to GHCR on the server, you can omit the credentials:

```bash
/opt/astrosolve/scripts/server_deploy.sh YOUR_IMAGE_TAG
```

`server_deploy.sh` is the stable operator and CI entrypoint. It delegates the reusable image-update mechanics to `server_update.sh`.

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

The release workflow will later SSH into the server and run:

```bash
GHCR_USERNAME="YOUR_GITHUB_OWNER" GHCR_TOKEN="${GITHUB_TOKEN_FROM_ACTION}" /opt/astrosolve/scripts/server_deploy.sh <release-version>
```

## 12. Rollback

On the server:

```bash
/opt/astrosolve/scripts/server_deploy.sh PREVIOUS_GOOD_TAG
```

## 13. Operational Rules

- Do not store astrometry indexes in the production image
- Do commit `data/local-catalog/celestial.sqlite` when you intentionally update the local catalog
- Do not rely on container-local data for astrometry indexes
- Normal commits to `main` should update the release PR and should not deploy
- Merging the generated release PR should deploy both frontend and backend
