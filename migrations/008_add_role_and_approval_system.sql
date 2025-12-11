-- Add role and seller approval system to users table
ALTER TABLE users 
ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'seller', 'admin')),
ADD COLUMN seller_status VARCHAR(20) DEFAULT NULL CHECK (seller_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN seller_approved_at TIMESTAMP,
ADD COLUMN seller_approved_by UUID REFERENCES users(id),
ADD COLUMN seller_rejection_reason TEXT;

-- Create index for role and seller_status
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_seller_status ON users(seller_status);

-- Add product review/approval fields to products table
ALTER TABLE products
ADD COLUMN review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN reviewed_at TIMESTAMP,
ADD COLUMN reviewed_by UUID REFERENCES users(id),
ADD COLUMN rejection_reason TEXT;

-- Create index for review_status
CREATE INDEX idx_products_review_status ON products(review_status);
CREATE INDEX idx_products_status_review ON products(status, review_status);

-- Update existing products to have review_status = 'approved' if they are published
UPDATE products SET review_status = 'approved' WHERE status = 'published';

-- Create seller applications table (optional - for tracking seller requests)
CREATE TABLE seller_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_data JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seller_applications_user_id ON seller_applications(user_id);
CREATE INDEX idx_seller_applications_status ON seller_applications(status);

COMMENT ON TABLE seller_applications IS 'Track seller registration applications';
COMMENT ON COLUMN users.role IS 'User role: user, seller, or admin';
COMMENT ON COLUMN users.seller_status IS 'Seller approval status: pending, approved, or rejected';
COMMENT ON COLUMN products.review_status IS 'Product review status: pending, approved, or rejected';

