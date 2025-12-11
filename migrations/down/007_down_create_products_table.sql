-- Down migration for 007_create_products_table.sql
-- Drop products table and related objects

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_update_products_updated_at ON products;
DROP FUNCTION IF EXISTS update_products_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_products_description_search;
DROP INDEX IF EXISTS idx_products_title_search;
DROP INDEX IF EXISTS idx_products_metadata;
DROP INDEX IF EXISTS idx_products_tags;
DROP INDEX IF EXISTS idx_products_downloads;
DROP INDEX IF EXISTS idx_products_rating;
DROP INDEX IF EXISTS idx_products_created_at;
DROP INDEX IF EXISTS idx_products_is_free;
DROP INDEX IF EXISTS idx_products_status;
DROP INDEX IF EXISTS idx_products_type;
DROP INDEX IF EXISTS idx_products_seller_id;

-- Drop products table (cascade will handle foreign keys)
DROP TABLE IF EXISTS products;

-- Drop enums
DROP TYPE IF EXISTS product_status;
DROP TYPE IF EXISTS product_type;

