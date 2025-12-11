-- Down migration for marketplace pricing/reviews/logs

-- Drop download_logs
DROP TABLE IF EXISTS download_logs;
DROP TYPE IF EXISTS download_type;

-- Drop reviews
DROP TABLE IF EXISTS reviews;
DROP TYPE IF EXISTS review_status;

-- Remove columns from products
ALTER TABLE products
    DROP COLUMN IF EXISTS currency,
    DROP COLUMN IF EXISTS price_type,
    DROP COLUMN IF EXISTS sales_count;

DROP TYPE IF EXISTS product_price_type;


