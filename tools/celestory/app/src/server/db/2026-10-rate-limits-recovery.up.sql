-- Incremental migration for an EXISTING Celestory database (the from-scratch
-- schema.sql already carries these). Idempotent and additive — no data is
-- dropped — so it is safe to run on the live dev/prod Neon DB instead of a
-- drop + recreate. Adds the rate-limit counters and the recovery-code hash.
--
-- Usage:  psql "$DATABASE_URL" -f 2026-10-rate-limits-recovery.up.sql

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Profiles published before this column existed have no recovery code
-- (NULL); recovery is refused for them until the owner gets a new code.
ALTER TABLE stories ADD COLUMN IF NOT EXISTS recovery_hash TEXT;
