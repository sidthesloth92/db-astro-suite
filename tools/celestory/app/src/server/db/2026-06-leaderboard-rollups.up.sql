-- Incremental migration for an EXISTING Celestory database (the from-scratch
-- schema.sql already carries these). Idempotent — safe to run once on the live
-- preview/prod Neon DB to add the equipment sub-type column and the per-month
-- rollup tables powering the time-windowed leaderboards. Run order:
--   1) apply this DDL, 2) run scripts/backfill-month-rollups.ts.

ALTER TABLE story_equipment ADD COLUMN IF NOT EXISTS subtype TEXT;

CREATE TABLE IF NOT EXISTS story_filter_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT,
  month DATE,
  seconds BIGINT,
  frames INT
);

CREATE TABLE IF NOT EXISTS story_equipment_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  equipment_id TEXT,
  month DATE,
  integration_seconds BIGINT,
  light_frame_count INT
);

CREATE INDEX IF NOT EXISTS idx_story_filter_months_story_id    ON story_filter_months(story_id);
CREATE INDEX IF NOT EXISTS idx_story_filter_months_month       ON story_filter_months(month);
CREATE INDEX IF NOT EXISTS idx_story_equipment_months_story_id ON story_equipment_months(story_id);
CREATE INDEX IF NOT EXISTS idx_story_equipment_months_month    ON story_equipment_months(month);
CREATE INDEX IF NOT EXISTS idx_story_equipment_months_equip_id ON story_equipment_months(equipment_id);
