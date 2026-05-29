# Astrosolve Server

A headless Node.js microservice that uses Astrometry.net for plate solving.

## Environment Variables

All configuration is supplied via environment variables. The table below documents every supported variable, its default value, and its effect.

| Variable                              | Default                 | Description                                                                               |
| ------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `ASTROSOLVE_PORT`                     | `3000`                  | API server port                                                                           |
| `ASTROSOLVE_HOST`                     | `0.0.0.0`               | API server host (use `0.0.0.0` in Docker)                                                 |
| `ASTROSOLVE_ORIGIN`                   | _(none — CORS blocked)_ | Allowed CORS origin(s). Comma-separate multiple. Use `localhost` to allow all (dev only). |
| `ASTROSOLVE_QUEUE_CONCURRENCY`        | `2`                     | Max concurrent plate-solve jobs                                                           |
| `ASTROSOLVE_QUEUE_MAX_SIZE`           | `10`                    | Max queued jobs before returning 503                                                      |
| `SOLVE_API_KEY_REQUIRED`              | `true`                  | Set to `false` to disable access-key auth                                                 |
| `ASTROSOLVE_TRUST_PROXY`              | `false`                 | Set to `true` when behind Cloudflare so rate limiting uses the real client IP             |
| `ASTROSOLVE_RATE_LIMIT_MAX`           | `5`                     | Max requests per IP per window (solve endpoint)                                           |
| `ASTROSOLVE_RATE_LIMIT_WINDOW`        | `1 minute`              | Rate-limit time window (e.g. `30 seconds`, `1 minute`)                                    |
| `ASTROSOLVE_HEALTH_RATE_LIMIT_MAX`    | `30`                    | Max requests per IP per minute on the health check (`GET /`)                              |
| `ASTROSOLVE_HEALTH_RATE_LIMIT_WINDOW` | `1 minute`              | Rate-limit time window for the health check endpoint                                      |

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

For local development without access keys, set `SOLVE_API_KEY_REQUIRED=false` explicitly.

The `astrosolve.sqlite` file holds both access keys and the `solve_events`
analytics table. It must be bind-mounted so its contents survive container
restarts. Docker creates a directory (not a file) at the bind target if the
host path doesn't exist, so create the empty file once before the first run:

```bash
cd tools/astrosolve/server
mkdir -p data
touch data/astrosolve.sqlite

docker run --rm -p 3000:3000 \
  --name astrosolve \
  -e SOLVE_API_KEY_REQUIRED=false \
  -e ASTROSOLVE_ORIGIN=http://localhost:4200 \
  -v $(pwd)/data/astrosolve.sqlite:/usr/src/app/data/astrosolve.sqlite \
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

Use the deploy runbook for the one-time VPS setup:

```bash
cat tools/astrosolve/server/scripts/deploy/deploy.md
```

The deployment scripts are:

```bash
tools/astrosolve/server/scripts/deploy/1_server_init.sh  # one-time server bootstrap
tools/astrosolve/server/scripts/deploy/2_deploy.sh       # pull image tag and start containers
tools/astrosolve/server/scripts/deploy/3_restart.sh      # restart without pulling a new image
tools/astrosolve/server/scripts/deploy/4_stop.sh         # gracefully stop containers
tools/astrosolve/server/scripts/deploy/5_teardown.sh     # DESTRUCTIVE — wipe everything
```

Use `1_server_init.sh` for one-time server bootstrap. It installs Docker, creates the deploy user, writes config, and downloads astrometry index files. Use `2_deploy.sh <release-version>` for rollouts and rollbacks.

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

# Rotate a user's key — invalidates the previous key and prints a new one
docker exec -it astrosolve node scripts/manage-keys.js rotate <username>

# Deactivate a user's key
docker exec -it astrosolve node scripts/manage-keys.js remove <username>

# List all keys and their status (does NOT print the plain keys — by design)
docker exec -it astrosolve node scripts/manage-keys.js list
```

> **Note:** The plain key is shown **once** when added or rotated. Only its SHA-256 hash is stored, so it cannot be recovered later from the database. Store it securely before closing the terminal.

> **Why `list` doesn't show the keys:** the database stores only the SHA-256 hash of each key, not the plain key. This is the same design as password storage — even a leaked DB cannot give an attacker working API keys. If a user has lost their key, use `rotate <username>` to issue them a fresh one without losing their analytics history.

> **Note:** `remove` deactivates the key (marks it inactive in the database). The row is retained for audit purposes. The user will no longer be able to submit solve requests. Use `rotate` instead if you want them to keep using the service with a new credential.

## Viewing Analytics

Solve events are stored in the `solve_events` table of `astrosolve.sqlite`. Use the analytics script via `docker exec` to query them:

```sh
# Aggregate stats — success rate, durations, file sizes, top users (default: last 7 days)
docker exec -it astrosolve node scripts/analytics.js summary
docker exec -it astrosolve node scripts/analytics.js summary --days 30

# Last N events, newest first (default: 20)
docker exec -it astrosolve node scripts/analytics.js recent
docker exec -it astrosolve node scripts/analytics.js recent --limit 50

# Per-user breakdown (default: last 7 days)
docker exec -it astrosolve node scripts/analytics.js by-user
docker exec -it astrosolve node scripts/analytics.js by-user --days 14

# Last N non-success events (default: 20)
docker exec -it astrosolve node scripts/analytics.js failures
docker exec -it astrosolve node scripts/analytics.js failures --limit 50

# Queue saturation stats — rejections, wait times, max depth (default: last 7 days)
docker exec -it astrosolve node scripts/analytics.js queue
docker exec -it astrosolve node scripts/analytics.js queue --days 30

# Dump all rows to CSV
docker exec -it astrosolve node scripts/analytics.js export /tmp/events.csv
docker cp astrosolve:/tmp/events.csv ./events.csv
```
