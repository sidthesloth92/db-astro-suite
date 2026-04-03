# Astrosolve Server

A headless Node.js microservice that uses Astrometry.net for plate solving.

## Local Development

To run the server locally, use Docker so the Astrometry.net system dependencies match production.

> Make sure Docker Desktop is running before building or starting the container.

### 1. Initialize databases (Astrometry indexes and Local Catalog)

```bash
cd tools/astrosolve/server
npm install
npm run init-db
```

This runs both `init-astrometry-db` (populates `data/astrometry/`) and `init-local-catalog-db` (creates `data/local-catalog/celestial.sqlite`).

### 2. Build the image

```bash
cd tools/astrosolve/server
docker build -t astrosolve .
```

### 4. Run the server with mounted local data

```bash
cd tools/astrosolve/server
docker run --rm -p 3000:3000 \
  -e ASTROSOLVE_ORIGIN=http://localhost:4200 \
  -v $(pwd)/data/astrometry:/usr/src/app/data/astrometry:ro \
  -v $(pwd)/data/local-catalog:/usr/src/app/data/local-catalog \
  -v $(pwd)/data/uploads:/usr/src/app/data/uploads \
  astrosolve
```

### 5. View logs

```bash
docker ps
docker logs -f <CONTAINER_ID>
```

## Production

Production keeps heavy runtime data on the server, not in the image:

- Astrometry indexes are mounted from persistent host storage
- `celestial.sqlite` is included from `data/local-catalog` in the image
- uploads are mounted from persistent host storage

Use the deploy runbook for the one-time Hetzner setup:

```bash
cat tools/astrosolve/server/scripts/deploy/deploy.md
```

The deployment scripts are:

```bash
tools/astrosolve/server/scripts/deploy/server_init.sh
tools/astrosolve/server/scripts/deploy/server_update.sh
tools/astrosolve/server/scripts/deploy/server_deploy.sh
```

Use `server_init.sh` for one-time server bootstrap, and use `server_deploy.sh <release-version>` for rollouts and rollbacks.
