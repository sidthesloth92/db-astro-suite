# Astrosolve Server

A headless Node.js microservice that uses Astrometry.net for plate solving.

## Which doc do I need?

| I want to…                                                     | Read                                                             |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| Configure it, run it locally, manage keys, view analytics      | **This README** (below)                                         |
| Set up a **brand-new** server from scratch                     | [`scripts/deploy/SERVER-SETUP.md`](scripts/deploy/SERVER-SETUP.md)   |
| **Move** the backend to a new server (keeping access keys)     | [`scripts/deploy/MIGRATE-SERVER.md`](scripts/deploy/MIGRATE-SERVER.md) |
| Dry-run the setup scripts in a local VM first                  | [`scripts/deploy/local-test.md`](scripts/deploy/local-test.md)  |
| (Re)build the local catalog on the server                      | `scripts/deploy/rebuild-catalog.sh` — see [Catalog Builds](#catalog-builds) below |

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

> **Note:** `init-local-catalog-db` downloads every catalog live, including
> Gaia DR3 G≤15 (~37M stars, fetched in RA/Dec tiles from the ESA archive in a
> bounded concurrent pool — expect roughly tens of minutes, not hours). It
> produces a ~8 GB file plus its R-tree spatial index, so it needs a working
> network connection and ~15 GB of free disk. A catalog tile that keeps failing
> is logged and skipped rather than aborting the whole build. The build is
> resumable — re-running skips already-loaded sources. `celestial.sqlite` is
> **not** committed to git and **not** baked into the Docker image. In
> production it is built **on the server, out-of-band** via
> `scripts/deploy/rebuild-catalog.sh` (a detached `docker run … npm run
> init-local-catalog-db`) and mounted read-only at runtime — exactly like the
> Astrometry.net FITS indexes. **Deploys never build it** (they just pull + swap
> the container); see `scripts/deploy/SERVER-SETUP.md` (§ Build the local catalog).

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
- `celestial.sqlite` is built on the server **out-of-band** via
  `scripts/deploy/rebuild-catalog.sh` (detached, resumable) and mounted read-only
  from `data/local-catalog` on the host — never baked into the image and never
  built by a deploy (see `scripts/deploy/SERVER-SETUP.md`)
- uploads are mounted from persistent host storage

Use the setup runbook for the one-time server setup (from scratch), or the migration runbook to move an
existing server:

```bash
cat tools/astrosolve/server/scripts/deploy/SERVER-SETUP.md     # brand-new server
cat tools/astrosolve/server/scripts/deploy/MIGRATE-SERVER.md   # move to a new server (keeps access keys)
```

The deployment scripts are:

```bash
tools/astrosolve/server/scripts/deploy/1_server_init.sh    # one-time server bootstrap
tools/astrosolve/server/scripts/deploy/rebuild-catalog.sh  # build/refresh the local catalog (detached)
tools/astrosolve/server/scripts/deploy/3_restart.sh        # restart the container without pulling a new image
tools/astrosolve/server/scripts/deploy/4_stop.sh           # gracefully stop the container
tools/astrosolve/server/scripts/deploy/5_teardown.sh       # DESTRUCTIVE — wipe everything
```

Use `1_server_init.sh` for the one-time server bootstrap (Docker, deploy user, data
dirs, astrometry indexes). **Rollouts and rollbacks are done via GitHub Actions**
(the `release-deploy` workflow), not a script — a deploy just pulls the image and
swaps the API container; it never builds the catalog.

## Catalog Builds

The local celestial catalog (`data/local-catalog/celestial.sqlite` — OpenNGC,
HyperLEDA, Milliquas, faint nebulae/clusters, Gaia DR3 G≤15, plus the R-tree
spatial index) is built **out-of-band on the server** — never by a deploy and
never baked into the image. `rebuild-catalog.sh` runs the build **detached**
(`docker run -d`), so an SSH disconnect can't interrupt it, and the build is
**resumable**: each loaded source is recorded and skipped next time, and the
R-tree is rebuilt only when a source actually (re)loaded.

> Scripts are copied to `/opt/astrosolve/scripts/` by SERVER-SETUP.md step 3. Optional
> overrides: `APP_DIR` (default `/opt/astrosolve`) and `IMAGE` (default: the
> latest pulled astrosolve image).

### First-time build

Run it **after** the first deploy — the deploy is what pulls an image onto the
server, and until this build finishes the API serves **catalog-less** (it runs,
just without catalog labels):

```bash
/opt/astrosolve/scripts/rebuild-catalog.sh   # full download, ~20–40 min (Gaia dominates)
docker logs -f catalog-build                 # watch; safe to Ctrl-C / disconnect — the build keeps running
docker restart astrosolve                    # after "R-tree spatial index built (...)" — API picks up the catalog
```

### Refresh (resumable — the gentle, common case)

To pick up new/changed sources without re-downloading everything:

```bash
/opt/astrosolve/scripts/rebuild-catalog.sh
docker restart astrosolve
```

It skips every already-loaded source and a consistent R-tree, so it's usually a
quick no-op; it only rebuilds the R-tree if something actually changed. The live
API is unaffected apart from the brief R-tree commit (if any).

### Full rebuild from scratch (`--rebuild`)

Only for a deliberate clean wipe (corruption, or to clear stale state). It
**drops all tables up front and re-downloads everything** (including Gaia), so
it is the long build **and** the catalog is empty/incomplete for its whole
duration — meaning a **running API's catalog lookups stay degraded (empty or
erroring) until it finishes**, not just briefly. Pick one:

```bash
# A) Keep the app up (catalog labels degraded during the build), restart after:
/opt/astrosolve/scripts/rebuild-catalog.sh --rebuild
docker logs -f catalog-build
docker restart astrosolve

# B) No degraded responses — full app downtime for the build instead:
docker stop astrosolve
/opt/astrosolve/scripts/rebuild-catalog.sh --rebuild
docker logs -f catalog-build
docker start astrosolve
```

### Why restart the API afterward

The build writes `celestial.sqlite` **in place**; `docker restart astrosolve`
reopens it on a fresh connection, which is the reliable way the running
container picks up the rebuilt catalog (the in-place `DROP`/`CREATE` churns the
schema and row ids, so a clean reopen beats relying on the live connection to
re-sync). The restart takes a few seconds.

> The same first-time and refresh flows are in the setup runbook
> (`scripts/deploy/SERVER-SETUP.md`); this section is the fuller operational
> reference.

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
