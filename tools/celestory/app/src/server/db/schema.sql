-- Celestory Phase 1 schema

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  key_hash TEXT NOT NULL,
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

CREATE INDEX idx_stories_handle ON stories(handle);
CREATE INDEX idx_story_objects_story_id ON story_objects(story_id);
CREATE INDEX idx_story_objects_object_id ON story_objects(object_id);
CREATE INDEX idx_story_equipment_story_id ON story_equipment(story_id);
CREATE INDEX idx_story_filters_story_id ON story_filters(story_id);
