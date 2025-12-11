-- Down migration for 004_create_fetch_schedules_table.sql
-- Drop fetch_schedules table

-- Drop indexes
DROP INDEX IF EXISTS idx_fetch_schedules_next_fetch;
DROP INDEX IF EXISTS idx_fetch_schedules_user_id;

-- Drop fetch_schedules table
DROP TABLE IF EXISTS fetch_schedules;

