-- Down migration for 002_create_personas_table.sql
-- Drop personas table

-- Drop index
DROP INDEX IF EXISTS idx_personas_user_id;

-- Drop personas table
DROP TABLE IF EXISTS personas;

