# 0001 — Local catalog moves out of the Docker image

**Applies when:** upgrading from a build where `celestial.sqlite` was baked
**into** the Docker image to the deep-search build, which instead **mounts** the
catalog from the host. The new container reads the catalog from the host
volume, so the catalog must exist there before it starts.

> See [README.md](./README.md) for `APP_DIR` / `IMAGE` / `SERVER_IP` / `SSH_KEY`
> definitions.

## Your existing solves are safe

Access keys and solve history live in `astrosolve.sqlite`, which is mounted from
the host and is **never** touched by this migration. The new code adds one
column (`objects_returned_quasars`) to `solve_events` automatically on startup
via `ALTER TABLE ADD COLUMN` — additive, so existing rows are preserved. No
backup step is required (a copy never hurts).

The catalog DB (`celestial.sqlite`) is regenerable data, not user data.

## Approach: build locally, upload, then deploy

The server never downloads Gaia. You build the catalog **on your Mac** and
rsync the finished file up. Merging the PR (the pipeline deploy) is what swaps
in the mount-aware image, which then finds the uploaded catalog.

### Steps

1. **Build the catalog locally** (on your Mac), once:

   ```bash
   cd tools/astrosolve/server
   npm run init-local-catalog-db
   ```

2. **Upload it to the server.** From the repo root, with the deploy env vars
   set (see deploy.md "Fill These Values First"):

   ```bash
   export SERVER_IP="<server-ip>" SSH_KEY="~/.ssh/db_astro_suite"
   export DEPLOY_USER="deploy" APP_DIR="/opt/astrosolve"
   bash tools/astrosolve/server/scripts/deploy/2_sync_catalog.sh
   ```

   This rsyncs `celestial.sqlite` into `$APP_DIR/data/local-catalog` on the
   server. It is resumable — re-run if the transfer drops. The old container
   keeps serving its in-image catalog throughout; nothing changes yet.

3. **Deploy.** Merge the PR (or run the pipeline). The new image mounts
   `data/local-catalog`, finds the uploaded catalog, and adds the
   `solve_events` column on startup. Downtime is the usual stop/run swap.

> Order matters: the catalog must be uploaded (step 2) **before** the deploy
> (step 3), or the new container aborts with "run npm run init-db first".

## Verify (after deploy)

```bash
curl -s https://api.dbastrosuite.com/                              # {"code":"OK",...}
docker logs astrosolve 2>&1 | grep -i "Local catalog DB opened"    # read the mounted catalog
```

Confirm old solves survived (count unchanged from before the migration):

```bash
docker run --rm \
  -v "$APP_DIR/data/astrosolve.sqlite:/usr/src/app/data/astrosolve.sqlite:ro" \
  "$IMAGE" \
  node -e "const D=require('better-sqlite3');const db=new D('/usr/src/app/data/astrosolve.sqlite',{readonly:true});console.log('solve_events rows:', db.prepare('SELECT COUNT(*) n FROM solve_events').get().n);"
```

## Refreshing the catalog later

Same as steps 1–2 (rebuild locally, re-run `2_sync_catalog.sh`), then restart
the running container so it reopens the new file:

```bash
ssh -i "$SSH_KEY" "$DEPLOY_USER@$SERVER_IP" '/root/astrosolve-deploy/3_restart.sh'
```

## Rollback

Redeploy the previous image tag. It carries its own in-image catalog, so it
does not depend on the host `data/local-catalog` volume, and it reads the same
`astrosolve.sqlite` (the extra column is ignored by old code).
