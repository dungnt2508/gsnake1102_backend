-- Down migration for 008_add_role_and_approval_system.sql
-- Remove role and seller approval system

-- Drop seller applications table
DROP TABLE IF EXISTS seller_applications;

-- Remove product review/approval fields from products table
DROP INDEX IF EXISTS idx_products_status_review;
DROP INDEX IF EXISTS idx_products_review_status;
ALTER TABLE products
    DROP COLUMN IF EXISTS rejection_reason,
    DROP COLUMN IF EXISTS reviewed_by,
    DROP COLUMN IF EXISTS reviewed_at,
    DROP COLUMN IF EXISTS review_status;

-- Remove role and seller approval fields from users table
DROP INDEX IF EXISTS idx_users_seller_status;
DROP INDEX IF EXISTS idx_users_role;
ALTER TABLE users
    DROP COLUMN IF EXISTS seller_rejection_reason,
    DROP COLUMN IF EXISTS seller_approved_by,
    DROP COLUMN IF EXISTS seller_approved_at,
    DROP COLUMN IF EXISTS seller_status,
    DROP COLUMN IF EXISTS role;

