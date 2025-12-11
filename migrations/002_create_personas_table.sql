-- Create personas table
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language_style VARCHAR(100) NOT NULL,
  tone VARCHAR(100) NOT NULL,
  topics_interest JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index on user_id
CREATE INDEX idx_personas_user_id ON personas(user_id);

COMMENT ON TABLE personas IS 'User personas for personalized AI responses';
COMMENT ON COLUMN personas.language_style IS 'Communication style: formal, casual, professional, etc.';
COMMENT ON COLUMN personas.tone IS 'Response tone: witty, neutral, friendly, etc.';
COMMENT ON COLUMN personas.topics_interest IS 'Array of topics user is interested in';
