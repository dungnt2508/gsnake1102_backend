-- Create users table
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  azure_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_azure_id ON users(azure_id);

COMMENT ON TABLE users IS 'User accounts with email/password and Azure OAuth support';
COMMENT ON COLUMN users.password_hash IS 'Nullable for OAuth-only users';
COMMENT ON COLUMN users.azure_id IS 'Azure AD user ID for OAuth login';
