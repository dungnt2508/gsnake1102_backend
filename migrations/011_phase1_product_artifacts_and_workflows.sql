-- Phase 1: Product Artifacts, Workflows, and Enhanced Products Table
-- This migration adds support for file uploads, workflow-specific data, and audit logs

-- 1. Update products table: Add new fields for Phase 1
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS changelog TEXT,
    ADD COLUMN IF NOT EXISTS license VARCHAR(50),
    ADD COLUMN IF NOT EXISTS author_contact VARCHAR(500),
    ADD COLUMN IF NOT EXISTS support_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS platform_requirements JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS ownership_declaration BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ownership_proof_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS security_scan_status VARCHAR(20) DEFAULT 'pending' CHECK (security_scan_status IN ('pending', 'passed', 'failed')),
    ADD COLUMN IF NOT EXISTS security_scan_result JSONB,
    ADD COLUMN IF NOT EXISTS security_scan_at TIMESTAMP;

-- Note: product_type enum extension sẽ được handle riêng vì PostgreSQL không cho ALTER TYPE trong transaction
-- Sẽ cần chạy riêng nếu muốn thêm 'website' và 'mobile_app' ngay

-- Create index for security scan status
CREATE INDEX IF NOT EXISTS idx_products_security_scan_status ON products(security_scan_status);

-- 2. Create product_artifacts table
CREATE TABLE IF NOT EXISTS product_artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    artifact_type VARCHAR(50) NOT NULL, -- 'workflow_json', 'readme', 'env_example', 'source_zip', 'manifest', etc.
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL, -- URL to file storage (local path or S3 URL)
    file_size BIGINT, -- bytes
    mime_type VARCHAR(100),
    checksum VARCHAR(64), -- SHA256 checksum
    version VARCHAR(50), -- Version của artifact này
    is_primary BOOLEAN DEFAULT false, -- Artifact chính (workflow.json cho workflow, APK cho mobile app)
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_artifacts_product_id ON product_artifacts(product_id);
CREATE INDEX IF NOT EXISTS idx_product_artifacts_type ON product_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_product_artifacts_primary ON product_artifacts(product_id, is_primary) WHERE is_primary = true;

COMMENT ON TABLE product_artifacts IS 'Stores product artifacts (files) such as workflow.json, README.md, source code, etc.';
COMMENT ON COLUMN product_artifacts.artifact_type IS 'Type of artifact: workflow_json, readme, env_example, source_zip, manifest, etc.';
COMMENT ON COLUMN product_artifacts.is_primary IS 'Whether this is the primary artifact for the product';

-- Create trigger to auto-update updated_at for product_artifacts
CREATE OR REPLACE FUNCTION update_product_artifacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_artifacts_updated_at
    BEFORE UPDATE ON product_artifacts
    FOR EACH ROW
    EXECUTE FUNCTION update_product_artifacts_updated_at();

-- 3. Create product_workflows table
CREATE TABLE IF NOT EXISTS product_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    n8n_version VARCHAR(50), -- Required n8n version (e.g., "1.0.0")
    workflow_json_url TEXT, -- URL to workflow.json (hoặc reference artifact_id)
    env_example_url TEXT, -- URL to .env.example
    readme_url TEXT, -- URL to README.md
    workflow_file_checksum VARCHAR(64), -- SHA256 của workflow.json
    nodes_count INTEGER, -- Số lượng nodes trong workflow
    triggers JSONB DEFAULT '[]'::jsonb, -- Array of trigger types ['webhook', 'schedule', etc.]
    credentials_required JSONB DEFAULT '[]'::jsonb, -- Array of required credentials ['openai', 'notion', etc.]
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_workflows_product_id ON product_workflows(product_id);
CREATE INDEX IF NOT EXISTS idx_product_workflows_n8n_version ON product_workflows(n8n_version);

COMMENT ON TABLE product_workflows IS 'Type-specific data for workflow products';
COMMENT ON COLUMN product_workflows.n8n_version IS 'Required n8n version for this workflow';
COMMENT ON COLUMN product_workflows.triggers IS 'Array of trigger types used in the workflow';
COMMENT ON COLUMN product_workflows.credentials_required IS 'Array of n8n credentials required to run this workflow';

-- Create trigger to auto-update updated_at for product_workflows
CREATE OR REPLACE FUNCTION update_product_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_workflows_updated_at
    BEFORE UPDATE ON product_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_product_workflows_updated_at();

-- 4. Create product_review_audit_log table
CREATE TABLE IF NOT EXISTS product_review_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_changes', 'flagged')),
    review_status_before VARCHAR(20), -- Status trước khi review
    review_status_after VARCHAR(20), -- Status sau khi review
    reason TEXT, -- Lý do approve/reject
    checklist_items JSONB DEFAULT '{}'::jsonb, -- Checklist items checked
    notes TEXT, -- Additional notes
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_review_audit_log_product_id ON product_review_audit_log(product_id);
CREATE INDEX IF NOT EXISTS idx_product_review_audit_log_reviewer_id ON product_review_audit_log(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_product_review_audit_log_created_at ON product_review_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_review_audit_log_action ON product_review_audit_log(action);

COMMENT ON TABLE product_review_audit_log IS 'Audit log for product review actions by admins/moderators';
COMMENT ON COLUMN product_review_audit_log.checklist_items IS 'JSON object with checklist items: {ownership_verified: true, security_scan_passed: true, etc.}';

-- 5. Comments for new product fields
COMMENT ON COLUMN products.changelog IS 'Product changelog (version history, updates)';
COMMENT ON COLUMN products.license IS 'License type: MIT, GPL, proprietary, etc.';
COMMENT ON COLUMN products.author_contact IS 'Seller contact information (email or website)';
COMMENT ON COLUMN products.screenshots IS 'Array of screenshot image URLs';
COMMENT ON COLUMN products.platform_requirements IS 'Platform requirements JSON: {os: "windows", min_version: "10", etc.}';
COMMENT ON COLUMN products.ownership_declaration IS 'Whether seller has declared ownership of the product';
COMMENT ON COLUMN products.security_scan_status IS 'Status of security scan: pending, passed, failed';

