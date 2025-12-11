-- Create tool request status enum
CREATE TYPE tool_request_status AS ENUM ('pending', 'processing', 'done', 'failed');

-- Create tool requests table
CREATE TABLE tool_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_payload JSONB NOT NULL,
  status tool_request_status NOT NULL DEFAULT 'pending',
  result JSONB,
  workflow_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_tool_requests_user_id ON tool_requests(user_id);
CREATE INDEX idx_tool_requests_status ON tool_requests(status);
CREATE INDEX idx_tool_requests_created_at ON tool_requests(created_at DESC);

COMMENT ON TABLE tool_requests IS 'Tool generation requests mailbox';
COMMENT ON COLUMN tool_requests.request_payload IS 'Input for tool generation (description, requirements)';
COMMENT ON COLUMN tool_requests.result IS 'Generated tool code or configuration';
COMMENT ON COLUMN tool_requests.workflow_id IS 'n8n workflow execution ID';
