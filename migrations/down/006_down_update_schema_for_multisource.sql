-- Down migration for 006_update_schema_for_multisource.sql
-- Revert multisource schema changes

-- Drop indexes
DROP INDEX IF EXISTS idx_articles_source_value;
DROP INDEX IF EXISTS idx_summaries_article_id;

-- Drop summaries table
DROP TABLE IF EXISTS summaries;

-- Revert fetch_schedules table changes
ALTER TABLE fetch_schedules
    DROP COLUMN IF EXISTS active,
    DROP COLUMN IF EXISTS source_value,
    DROP COLUMN IF EXISTS source_type,
    ALTER COLUMN article_url SET NOT NULL;

-- Revert articles table changes
ALTER TABLE articles
    ADD CONSTRAINT articles_url_key UNIQUE (url),
    ALTER COLUMN url SET NOT NULL,
    DROP COLUMN IF EXISTS metadata,
    DROP COLUMN IF EXISTS raw_text,
    DROP COLUMN IF EXISTS source_value,
    DROP COLUMN IF EXISTS source_type;

-- Drop source_type enum
DROP TYPE IF EXISTS source_type;

