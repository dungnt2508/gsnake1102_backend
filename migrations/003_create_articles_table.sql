-- Create article status enum
CREATE TYPE article_status AS ENUM ('pending', 'processing', 'done', 'failed');

-- Create articles table
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url VARCHAR(2048) NOT NULL UNIQUE,
  title VARCHAR(500),
  fetched_at TIMESTAMP DEFAULT NOW(),
  summary TEXT,
  source VARCHAR(255),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_id UUID,
  status article_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_articles_user_id ON articles(user_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_url ON articles(url);

COMMENT ON TABLE articles IS 'Articles submitted for summarization';
COMMENT ON COLUMN articles.workflow_id IS 'n8n workflow execution ID for tracking';
COMMENT ON COLUMN articles.status IS 'Processing status: pending, processing, done, failed';
