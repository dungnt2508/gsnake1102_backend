-- Down migration for 003_create_articles_table.sql
-- Drop articles table

-- Drop indexes
DROP INDEX IF EXISTS idx_articles_url;
DROP INDEX IF EXISTS idx_articles_status;
DROP INDEX IF EXISTS idx_articles_user_id;

-- Drop articles table
DROP TABLE IF EXISTS articles;

-- Drop enum
DROP TYPE IF EXISTS article_status;

