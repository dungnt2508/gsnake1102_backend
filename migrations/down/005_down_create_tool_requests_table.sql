-- Down migration for 005_create_tool_requests_table.sql
-- Drop tool_requests table

-- Drop indexes
DROP INDEX IF EXISTS idx_tool_requests_created_at;
DROP INDEX IF EXISTS idx_tool_requests_status;
DROP INDEX IF EXISTS idx_tool_requests_user_id;

-- Drop tool_requests table
DROP TABLE IF EXISTS tool_requests;

-- Drop enum
DROP TYPE IF EXISTS tool_request_status;

