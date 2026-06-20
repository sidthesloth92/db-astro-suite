-- Celestory Phase 1 schema

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  -- Legacy one-time delete key hash. No longer written: management is now
  -- authorized by the password (login) + a signed session token. Kept nullable
  -- for backward compatibility with rows created before this change.
  key_hash TEXT,
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

-- Anonymous, privacy-preserving append-only upload log. One row PER UPLOAD: an
-- unauthenticated visualise/upload always counts (repeats of the same file
-- included). Authenticated owners are deduped later by the publish claim +
-- latest-per-owner replay — never here — so they are not double-counted.
-- Holds no ledger contents — only the owner anchors + three headline integers.
--
-- install_id is always present and is NEVER overwritten (audit anchor).
-- profile_id is NULL while anonymous and is set ONLY by the password-gated
-- publish claim (never accepted from the raw upload payload). Community totals
-- are replayed as the latest row per owner = COALESCE(profile_id, install_id).
--
-- Migrate the legacy `ledger_pings` table (pre-rename) in place, preserving its
-- rows: rename the table + the created_at column, before the CREATE below turns
-- into a no-op. Idempotent; does nothing on a fresh database.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'ledger_pings') THEN
    ALTER TABLE ledger_pings RENAME TO ledger_uploads;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'ledger_uploads'
               AND column_name = 'created_at') THEN
    ALTER TABLE ledger_uploads RENAME COLUMN created_at TO uploaded_at;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ledger_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  install_id TEXT NOT NULL,
  profile_id TEXT,
  data_fingerprint TEXT NOT NULL,
  total_integration_seconds BIGINT,
  light_frame_count INT,
  object_count INT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Backfill the claim column for databases migrated from the legacy ledger_pings
-- table (which had no profile_id). No-op once present.
ALTER TABLE ledger_uploads ADD COLUMN IF NOT EXISTS profile_id TEXT;

-- Drop the legacy (install_id, data_fingerprint) uniqueness so every anonymous
-- upload is its own row (repeats of the same file count). Covers both the
-- original and the renamed-from-ledger_pings constraint names. No-op once gone.
ALTER TABLE ledger_uploads DROP CONSTRAINT IF EXISTS ledger_uploads_install_id_data_fingerprint_key;
ALTER TABLE ledger_uploads DROP CONSTRAINT IF EXISTS ledger_pings_install_id_data_fingerprint_key;

CREATE INDEX IF NOT EXISTS idx_ledger_uploads_install ON ledger_uploads(install_id);
CREATE INDEX IF NOT EXISTS idx_ledger_uploads_profile ON ledger_uploads(profile_id);

-- Password protects the profile: it gates updates and mints the login session
-- token that authorizes edit/delete. Backfill for databases created before
-- password support was added:
ALTER TABLE stories ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Drop the legacy NOT NULL on key_hash: the one-time delete key is retired in
-- favour of password login + session tokens, so new rows no longer set it.
ALTER TABLE stories ALTER COLUMN key_hash DROP NOT NULL;

CREATE INDEX idx_stories_handle ON stories(handle);
CREATE INDEX idx_story_objects_story_id ON story_objects(story_id);
CREATE INDEX idx_story_objects_object_id ON story_objects(object_id);
CREATE INDEX idx_story_equipment_story_id ON story_equipment(story_id);
CREATE INDEX idx_story_filters_story_id ON story_filters(story_id);
