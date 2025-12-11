-- Create source_type enum
CREATE TYPE source_type AS ENUM ('url', 'rss', 'file');

-- Update articles table
ALTER TABLE articles 
    ADD COLUMN source_type source_type DEFAULT 'url',
    ADD COLUMN source_value TEXT,
    ADD COLUMN raw_text TEXT,
    ADD COLUMN metadata JSONB DEFAULT '{}',
    ALTER COLUMN url DROP NOT NULL,
    DROP CONSTRAINT IF EXISTS articles_url_key;

-- Create summaries table
CREATE TABLE summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    summary_text TEXT,
    insights_json JSONB DEFAULT '[]',
    data_points_json JSONB DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for summaries
CREATE INDEX idx_summaries_article_id ON summaries(article_id);

-- Update fetch_schedules table (renaming to schedules or just altering)
-- Let's alter fetch_schedules to be more generic
ALTER TABLE fetch_schedules
    ADD COLUMN source_type source_type DEFAULT 'url',
    ADD COLUMN source_value TEXT,
    ADD COLUMN active BOOLEAN DEFAULT true,
    ALTER COLUMN article_url DROP NOT NULL;

-- Create index for source_value
CREATE INDEX idx_articles_source_value ON articles(source_value);
