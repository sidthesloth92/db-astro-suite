# Astrosolve Deployment Migrations

Steps needed when upgrading an **already-deployed** Astrosolve server. Each
migration is a numbered file in this folder. Apply, in ascending order, every
migration **newer than the version currently running** on the server.

## Index

| #    | Migration                                                                    |
| ---- | ---------------------------------------------------------------------------- |
| 0001 | [Local catalog moves out of the Docker image](./0001-local-catalog-out-of-image.md) |

## Adding a new migration

- Create `NNNN-short-slug.md` with the next zero-padded number.
- Add a row to the index table above.
- Make it self-contained: what changed, why it's safe for existing data, the
  exact steps, and a rollback.

## General rules (apply to every migration)

- `astrosolve.sqlite` (access keys + `solve_events` analytics) is host-mounted
  and **never** touched by a deploy. Schema changes are applied as idempotent
  `ALTER TABLE ADD COLUMN` statements on startup, which preserve all existing
  rows. Existing solves are not lost.
- The catalog DB (`celestial.sqlite`) is regenerable and is rebuilt by the init
  script — it is not user data.
- `APP_DIR` is the value configured in the GitHub Actions `APP_DIR` variable
  (e.g. `/opt/astrosolve`). `IMAGE` is the pulled astrosolve image tag for the
  release you are deploying. `SERVER_IP` / `SSH_KEY` / `DEPLOY_USER` are the
  values from deploy.md "Fill These Values First" (used by `2_sync_catalog.sh`).
- The celestial catalog is built **on your Mac** and uploaded with
  `2_sync_catalog.sh` — the server never downloads Gaia.
