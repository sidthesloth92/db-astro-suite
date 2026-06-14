-- Celestory Phase 1 schema

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  key_hash TEXT NOT NULL,
  password_hash TEXT,
  ledger_json TEXT NOT NULL,
  total_integration_seconds BIGINT,
  object_count INT,
  night_count INT,
  light_frame_count INT,
  first_light TIMESTAMP,
  latest_session TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  object_id TEXT,
  designation TEXT,
  category TEXT,
  integration_seconds BIGINT,
  light_frame_count INT,
  night_count INT
);

CREATE TABLE IF NOT EXISTS story_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  kind TEXT,
  display_name TEXT,
  normalized_key TEXT,
  integration_seconds BIGINT
);

CREATE TABLE IF NOT EXISTS story_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT,
  seconds BIGINT,
  frames INT
);

-- Anonymous, privacy-preserving append-only upload log. One row per distinct
-- (install id + data fingerprint) pair; re-uploading the same data is a no-op.
-- Holds no ledger contents — only the owner anchors + three headline integers.
--
-- install_id is always present and is NEVER overwritten (audit anchor).
-- profile_id is NULL while anonymous and is set ONLY by the password-gated
-- publish claim (never accepted from the raw upload payload). Community totals
-- are replayed as the latest row per owner = COALESCE(profile_id, install_id).
CREATE TABLE IF NOT EXISTS ledger_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id TEXT NOT NULL,
  profile_id TEXT,
  data_fingerprint TEXT NOT NULL,
  total_integration_seconds BIGINT,
  light_frame_count INT,
  object_count INT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (install_id, data_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_ledger_uploads_install ON ledger_uploads(install_id);
CREATE INDEX IF NOT EXISTS idx_ledger_uploads_profile ON ledger_uploads(profile_id);

-- Password protects profile updates; the (separate) one-time key deletes.
-- Backfill for databases created before password support was added:
ALTER TABLE stories ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX idx_stories_handle ON stories(handle);
CREATE INDEX idx_story_objects_story_id ON story_objects(story_id);
CREATE INDEX idx_story_objects_object_id ON story_objects(object_id);
CREATE INDEX idx_story_equipment_story_id ON story_equipment(story_id);
CREATE INDEX idx_story_filters_story_id ON story_filters(story_id);
