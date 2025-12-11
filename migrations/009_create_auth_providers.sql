-- Create auth_providers table for OAuth mappings
CREATE TABLE IF NOT EXISTS auth_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ensure one provider_user_id maps to exactly one user
CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_providers_provider_user
  ON auth_providers(provider, provider_user_id);

CREATE INDEX IF NOT EXISTS idx_auth_providers_user
  ON auth_providers(user_id);

COMMENT ON TABLE auth_providers IS 'OAuth provider bindings (e.g., Google)';
COMMENT ON COLUMN auth_providers.provider IS 'Provider key, e.g., google';
COMMENT ON COLUMN auth_providers.provider_user_id IS 'Provider-side subject/user id';


