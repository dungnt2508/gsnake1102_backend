-- Create product type enum
CREATE TYPE product_type AS ENUM ('workflow', 'tool', 'integration');

-- Create product status enum
CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  type product_type NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  workflow_file_url TEXT,
  thumbnail_url TEXT,
  preview_image_url TEXT,
  is_free BOOLEAN NOT NULL DEFAULT true,
  price DECIMAL(10, 2),
  status product_status NOT NULL DEFAULT 'draft',
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  version VARCHAR(50),
  requirements JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  install_guide TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_is_free ON products(is_free);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_rating ON products(rating DESC);
CREATE INDEX idx_products_downloads ON products(downloads DESC);

-- Create GIN index for tags (array search)
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- Create GIN index for metadata (JSONB search)
CREATE INDEX idx_products_metadata ON products USING GIN(metadata);

-- Add full-text search index for title and description
CREATE INDEX idx_products_title_search ON products USING gin(to_tsvector('english', title));
CREATE INDEX idx_products_description_search ON products USING gin(to_tsvector('english', description));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Comments for documentation
COMMENT ON TABLE products IS 'Marketplace products (workflows, tools, integrations)';
COMMENT ON COLUMN products.seller_id IS 'User who created/owns this product';
COMMENT ON COLUMN products.type IS 'Product type: workflow, tool, or integration';
COMMENT ON COLUMN products.tags IS 'Array of tags for categorization and search';
COMMENT ON COLUMN products.workflow_file_url IS 'URL to the workflow file (JSON) or tool package';
COMMENT ON COLUMN products.thumbnail_url IS 'Thumbnail image URL for product card';
COMMENT ON COLUMN products.preview_image_url IS 'Preview image/video URL for product detail page';
COMMENT ON COLUMN products.is_free IS 'Whether the product is free or paid';
COMMENT ON COLUMN products.price IS 'Price in currency (null if free)';
COMMENT ON COLUMN products.status IS 'Product status: draft (not published), published (visible), archived (hidden)';
COMMENT ON COLUMN products.requirements IS 'Array of requirements (e.g., ["n8n 1.0+", "OpenAI API key"])';
COMMENT ON COLUMN products.features IS 'Array of features (e.g., ["GPT-4 Integration", "Auto-posting"])';
COMMENT ON COLUMN products.metadata IS 'Additional metadata (platforms, integrations, etc.)';

