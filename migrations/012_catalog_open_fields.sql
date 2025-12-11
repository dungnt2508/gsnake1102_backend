-- Add catalog-open specific fields for demo/contact and requirements
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS video_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS contact_channel VARCHAR(500),
    ADD COLUMN IF NOT EXISTS required_credentials JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_video_url ON products(video_url);
CREATE INDEX IF NOT EXISTS idx_products_contact_channel ON products(contact_channel);

