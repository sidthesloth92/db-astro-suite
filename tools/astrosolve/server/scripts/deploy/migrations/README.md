# Astrosolve Deployment Migrations

Steps needed when upgrading an **already-deployed** Astrosolve server. Each
migration is a numbered file in this folder. Apply, in ascending order, every
migration **newer than the version currently running** on the server.

## Index

_No migrations yet._ When a deploy needs a manual step beyond a normal rollout,
add it here as `0001-short-slug.md` (see "Adding a new migration" below).

| #   | Migration |
| --- | --------- |
|     |           |

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
  script (`npm run init-local-catalog-db`) — it is not user data. It is built
  **on the server**, automatically by the deploy pipeline (a resumable one-shot
  `docker run` against the pulled image, before the API starts), like the
  astrometry indexes.
- `APP_DIR` is the value configured in the GitHub Actions `APP_DIR` variable
  (e.g. `/opt/astrosolve`). `IMAGE` is the pulled astrosolve image tag for the
  release you are deploying.
