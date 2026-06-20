-- Celestory schema — full from-scratch definition for a FRESH database.
--
-- This is the complete, final schema (no migrations / ALTERs / backfills). It is
-- written for a database that has never been deployed: wipe with drop.sql, then
-- apply this. Run order does not matter for children vs. parent — the parent
-- (stories) is created first so the foreign keys resolve.
--
-- Usage:  psql "$DATABASE_URL" -f drop.sql && psql "$DATABASE_URL" -f schema.sql
--
-- gen_random_uuid() is built into PostgreSQL 13+ (Neon) — no extension needed.

-- ── Published profiles ────────────────────────────────────────────────────────
-- One row per claimed handle. The full story blob is stored verbatim for
-- rendering; headline totals are denormalized for cheap listing/sorting. The
-- password gates updates/deletes and mints the owner session token.
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  story_json TEXT NOT NULL,
  total_integration_seconds BIGINT,
  object_count INT,
  night_count INT,
  light_frame_count INT,
  first_light TIMESTAMP,
  latest_session TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Per-story child rows (denormalized from the story on publish) ─────────────
-- Rebuilt on every re-publish, so each handle always holds exactly one current
-- snapshot. These power the community leaderboards, which rank PUBLISHED
-- profiles only.

CREATE TABLE story_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  object_id TEXT,
  designation TEXT,
  category TEXT,
  integration_seconds BIGINT,
  light_frame_count INT,
  night_count INT
);

-- equipment_id is the CLI's canonical cross-user join key (e.g. "cam-2600mm",
-- "telescope-redcat-51"); focal_length_mm / f_ratio power the telescope-specs board.
CREATE TABLE story_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  equipment_id TEXT,
  kind TEXT,
  display_name TEXT,
  normalized_key TEXT,
  integration_seconds BIGINT,
  light_frame_count INT,
  focal_length_mm INT,
  f_ratio REAL
);

CREATE TABLE story_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT,
  seconds BIGINT,
  frames INT
);

-- Per-object, per-month rollup powering the time/seasonality boards. `month` is
-- the first day of the month, so one DATE column serves per-year, all-time, and
-- seasonality (month-of-year) views.
CREATE TABLE story_object_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  object_id TEXT,
  designation TEXT,
  category TEXT,
  month DATE,
  integration_seconds BIGINT,
  light_frame_count INT
);

-- ── Anonymous upload log ──────────────────────────────────────────────────────
-- Privacy-preserving, append-only — one row per upload (visualise or publish),
-- never deduped on insert. Holds no story contents — only the owner anchors +
-- three headline integers. profile_id is NULL while anonymous and is set ONLY by
-- the password-gated publish claim; community totals count each claimed owner
-- once (latest snapshot) plus every anonymous upload.
CREATE TABLE story_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id TEXT NOT NULL,
  profile_id TEXT,
  data_fingerprint TEXT NOT NULL,
  total_integration_seconds BIGINT,
  light_frame_count INT,
  object_count INT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- (stories.handle is already indexed by its UNIQUE constraint.)
CREATE INDEX idx_story_objects_story_id        ON story_objects(story_id);
CREATE INDEX idx_story_objects_object_id       ON story_objects(object_id);
CREATE INDEX idx_story_equipment_story_id      ON story_equipment(story_id);
CREATE INDEX idx_story_equipment_equipment_id  ON story_equipment(equipment_id);
CREATE INDEX idx_story_filters_story_id        ON story_filters(story_id);
CREATE INDEX idx_story_object_months_story_id  ON story_object_months(story_id);
CREATE INDEX idx_story_object_months_month     ON story_object_months(month);
CREATE INDEX idx_story_object_months_object_id ON story_object_months(object_id);
CREATE INDEX idx_story_uploads_install         ON story_uploads(install_id);
CREATE INDEX idx_story_uploads_profile         ON story_uploads(profile_id);
