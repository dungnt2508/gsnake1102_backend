-- Create fetch schedules table
CREATE TABLE fetch_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_url VARCHAR(2048) NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  last_fetched TIMESTAMP,
  next_fetch TIMESTAMP NOT NULL,
  workflow_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_fetch_schedules_user_id ON fetch_schedules(user_id);
CREATE INDEX idx_fetch_schedules_next_fetch ON fetch_schedules(next_fetch);

COMMENT ON TABLE fetch_schedules IS 'Scheduled article fetching configuration';
COMMENT ON COLUMN fetch_schedules.frequency IS 'Fetch frequency: daily, weekly, monthly';
COMMENT ON COLUMN fetch_schedules.next_fetch IS 'Next scheduled fetch time';
COMMENT ON COLUMN fetch_schedules.workflow_id IS 'n8n workflow instance ID';
