-- Down migration for 001_create_users_table.sql
-- Drop users table and extension

-- Drop indexes
DROP INDEX IF EXISTS idx_users_azure_id;
DROP INDEX IF EXISTS idx_users_email;

-- Drop users table
DROP TABLE IF EXISTS users;

-- Note: uuid-ossp extension is not dropped as it may be used by other objects

