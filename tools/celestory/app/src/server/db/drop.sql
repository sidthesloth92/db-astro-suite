-- Celestory — WIPE the database (destructive).
--
-- Drops every Celestory table and its data. CASCADE also removes dependent
-- objects (foreign keys, child rows). Safe to run on a partially-created or
-- empty database — IF EXISTS makes each drop a no-op when the table is absent.
--
-- Usage:  psql "$DATABASE_URL" -f drop.sql
-- Then recreate with:  psql "$DATABASE_URL" -f schema.sql

DROP TABLE IF EXISTS story_target_months CASCADE;
DROP TABLE IF EXISTS story_targets CASCADE;
DROP TABLE IF EXISTS story_equipment CASCADE;
DROP TABLE IF EXISTS story_filters CASCADE;
DROP TABLE IF EXISTS story_uploads CASCADE;
-- Legacy pre-rename names (object→target), in case an old DB is being wiped.
DROP TABLE IF EXISTS story_object_months CASCADE;
DROP TABLE IF EXISTS story_objects CASCADE;
-- Legacy pre-rename names of story_uploads, in case an old DB is being wiped.
DROP TABLE IF EXISTS ledger_uploads CASCADE;
DROP TABLE IF EXISTS ledger_pings CASCADE;
DROP TABLE IF EXISTS stories CASCADE;
