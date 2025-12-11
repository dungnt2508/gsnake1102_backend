-- Marketplace mini: pricing detail, sales count, reviews, download logs

-- 1) Enum for price_type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_price_type') THEN
        CREATE TYPE product_price_type AS ENUM ('free', 'onetime', 'subscription');
    END IF;
END$$;

-- 2) Extend products table
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'VND',
    ADD COLUMN IF NOT EXISTS price_type product_price_type DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_price_type ON products(price_type);
CREATE INDEX IF NOT EXISTS idx_products_sales_count ON products(sales_count DESC);
CREATE INDEX IF NOT EXISTS idx_products_currency ON products(currency);

-- 3) Reviews table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content TEXT,
    status review_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

COMMENT ON TABLE reviews IS 'User reviews for products';
COMMENT ON COLUMN reviews.status IS 'Review moderation status';

-- 4) Download/Sales log (stub until real payments)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'download_type') THEN
        CREATE TYPE download_type AS ENUM ('free', 'manual');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS download_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type download_type NOT NULL DEFAULT 'free',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_download_logs_product ON download_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_seller ON download_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_buyer ON download_logs(buyer_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_type ON download_logs(type);

COMMENT ON TABLE download_logs IS 'Tracks downloads/sales for marketplace metrics';


