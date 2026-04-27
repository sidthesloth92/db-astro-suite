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

### 3. Run the server with mounted local data

```bash
cd tools/astrosolve/server
docker run --rm -p 3000:3000 \
  --name astrosolve \
  -e ASTROSOLVE_ORIGIN=http://localhost:4200 \
  -v $(pwd)/data/astrometry:/usr/src/app/data/astrometry:ro \
  -v $(pwd)/data/local-catalog:/usr/src/app/data/local-catalog \
  -v $(pwd)/data/uploads:/usr/src/app/data/uploads \
  astrosolve
```

### 4. View logs

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

## Managing Access Keys

Access keys protect the `/api/v1/solve` endpoint. When enabled, each caller must supply a unique key in the `x-access-key` request header.

### Enabling access control

Pass `SOLVE_API_KEY_REQUIRED=true` when starting the container:

```bash
docker run --rm -p 3000:3000 \
  --name astrosolve \
  -e SOLVE_API_KEY_REQUIRED=true \
  -e ASTROSOLVE_ORIGIN=http://localhost:4200 \
  -v $(pwd)/data/astrometry:/usr/src/app/data/astrometry:ro \
  -v $(pwd)/data/local-catalog:/usr/src/app/data/local-catalog \
  -v $(pwd)/data/uploads:/usr/src/app/data/uploads \
  astrosolve
```

### Managing keys on the server

SSH into the server, then use `docker exec` to run the key-management script inside the running container:

```sh
# Add a key for a user (prints the plain key once — store it securely)
docker exec -it astrosolve node scripts/manage-keys.js add <username>

# Deactivate a user's key
docker exec -it astrosolve node scripts/manage-keys.js remove <username>

# List all keys and their status
docker exec -it astrosolve node scripts/manage-keys.js list
```

> **Note:** The plain key is shown **once** when added. It cannot be recovered — store it securely before closing the terminal.

> **Note:** `remove` deactivates the key (marks it inactive in the database). The row is retained for audit purposes. The user will no longer be able to submit solve requests.
