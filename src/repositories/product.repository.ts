import pool from '../config/database';
import { Product, CreateProductInput, UpdateProductInput, ProductQueryFilters, ProductType, ProductStatus, ProductReviewStatus } from '@gsnake/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { mapDbRow, parseNumber, prepareDbData } from '../utils/db-mapper';

export class ProductRepository {
    /**
     * Find all products with filters
     */
    async findMany(filters: ProductQueryFilters = {}): Promise<{ products: Product[]; total: number }> {
        const conditions: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        // Build WHERE conditions
        if (filters.type) {
            conditions.push(`type = $${paramIndex++}`);
            values.push(filters.type);
        }

        if (filters.status) {
            conditions.push(`status = $${paramIndex++}`);
            values.push(filters.status);
        }

        if (filters.review_status) {
            conditions.push(`review_status = $${paramIndex++}`);
            values.push(filters.review_status);
        }

        if (filters.is_free !== undefined) {
            conditions.push(`is_free = $${paramIndex++}`);
            values.push(filters.is_free);
        }

        if (filters.price_type) {
            conditions.push(`price_type = $${paramIndex++}`);
            values.push(filters.price_type);
        }

        if (filters.seller_id) {
            conditions.push(`seller_id = $${paramIndex++}`);
            values.push(filters.seller_id);
        }

        if (filters.search) {
            conditions.push(`(
                to_tsvector('english', title) @@ plainto_tsquery('english', $${paramIndex}) OR
                to_tsvector('english', description) @@ plainto_tsquery('english', $${paramIndex}) OR
                title ILIKE $${paramIndex + 1} OR
                description ILIKE $${paramIndex + 1}
            )`);
            const searchTerm = `%${filters.search}%`;
            values.push(filters.search, searchTerm);
            paramIndex += 2;
        }

        if (filters.tags && filters.tags.length > 0) {
            conditions.push(`tags && $${paramIndex++}`);
            values.push(filters.tags);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Build ORDER BY
        const allowedSort = ['created_at', 'rating', 'downloads', 'sales_count', 'price'] as const;
        const sortBy = filters.sort_by && (allowedSort as readonly string[]).includes(filters.sort_by) ? filters.sort_by : 'created_at';
        const sortOrder = filters.sort_order || 'desc';
        const orderBy = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

        // Build LIMIT and OFFSET
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        const limitClause = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(limit, offset);

        // Get total count
        const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM products ${whereClause}`,
            values.slice(0, values.length - 2) // Exclude limit and offset for count
        );
        const total = parseInt(countResult.rows[0].total, 10);

        // Get products
        const result = await pool.query(
            `SELECT * FROM products ${whereClause} ${orderBy} ${limitClause}`,
            values
        );

        return {
            products: result.rows.map(row => this.postProcessProduct(this.mapRowToProduct(row))),
            total,
        };
    }

    /**
     * Find product by ID
     */
    async findById(id: string): Promise<Product | null> {
        const result = await pool.query(
            'SELECT * FROM products WHERE id = $1',
            [id]
        );
        if (!result.rows[0]) return null;
        return this.postProcessProduct(this.mapRowToProduct(result.rows[0]));
    }

    /**
     * Find products by seller ID
     */
    async findBySellerId(sellerId: string, limit: number = 50, offset: number = 0): Promise<Product[]> {
        const result = await pool.query(
            'SELECT * FROM products WHERE seller_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [sellerId, limit, offset]
        );
        return result.rows.map(row => this.postProcessProduct(this.mapRowToProduct(row)));
    }

    /**
     * Create product
     */
    async create(data: CreateProductInput & { review_status?: ProductReviewStatus }): Promise<Product> {
        const id = uuidv4();
        const now = new Date();

        const result = await pool.query(
            `INSERT INTO products (
                id, seller_id, title, description, long_description, type, tags,
                workflow_file_url, thumbnail_url, preview_image_url,
                is_free, price, currency, price_type, status, review_status, version, requirements, features,
                install_guide, metadata, changelog, license, author_contact, support_url, screenshots,
                platform_requirements, ownership_declaration, ownership_proof_url, terms_accepted_at,
                created_at, updated_at, sales_count
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
            ) RETURNING *`,
            [
                id,
                data.seller_id,
                data.title,
                data.description,
                data.long_description || null,
                data.type,
                data.tags ? JSON.stringify(data.tags) : '[]',
                data.workflow_file_url || null,
                data.thumbnail_url || null,
                data.preview_image_url || null,
                data.is_free,
                data.price || null,
                data.currency || 'VND',
                data.price_type || 'free',
                data.status,
                data.review_status,
                data.version || null,
                data.requirements ? JSON.stringify(data.requirements) : '[]',
                data.features ? JSON.stringify(data.features) : '[]',
                data.install_guide || null,
                data.metadata ? JSON.stringify(data.metadata) : '{}',
                data.changelog || null,
                data.license || null,
                data.author_contact || null,
                data.support_url || null,
                data.screenshots ? JSON.stringify(data.screenshots) : '[]',
                data.platform_requirements ? JSON.stringify(data.platform_requirements) : '{}',
                data.ownership_declaration || false,
                data.ownership_proof_url || null,
                data.terms_accepted_at || null,
                now,
                now,
                0,
            ]
        );

        return this.postProcessProduct(this.mapRowToProduct(result.rows[0]));
    }

    /**
     * Update product
     */
    async update(id: string, data: UpdateProductInput): Promise<Product | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            values.push(data.title);
        }
        if (data.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(data.description);
        }
        if (data.long_description !== undefined) {
            updates.push(`long_description = $${paramIndex++}`);
            values.push(data.long_description);
        }
        if (data.type !== undefined) {
            updates.push(`type = $${paramIndex++}`);
            values.push(data.type);
        }
        if (data.tags !== undefined) {
            updates.push(`tags = $${paramIndex++}`);
            values.push(JSON.stringify(data.tags));
        }
        if (data.workflow_file_url !== undefined) {
            updates.push(`workflow_file_url = $${paramIndex++}`);
            values.push(data.workflow_file_url);
        }
        if (data.thumbnail_url !== undefined) {
            updates.push(`thumbnail_url = $${paramIndex++}`);
            values.push(data.thumbnail_url);
        }
        if (data.preview_image_url !== undefined) {
            updates.push(`preview_image_url = $${paramIndex++}`);
            values.push(data.preview_image_url);
        }
        if (data.is_free !== undefined) {
            updates.push(`is_free = $${paramIndex++}`);
            values.push(data.is_free);
        }
        if (data.price !== undefined) {
            updates.push(`price = $${paramIndex++}`);
            values.push(data.price);
        }
        if (data.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(data.status);
        }
        if (data.currency !== undefined) {
            updates.push(`currency = $${paramIndex++}`);
            values.push(data.currency);
        }
        if (data.price_type !== undefined) {
            updates.push(`price_type = $${paramIndex++}`);
            values.push(data.price_type);
        }
        if (data.version !== undefined) {
            updates.push(`version = $${paramIndex++}`);
            values.push(data.version);
        }
        if (data.requirements !== undefined) {
            updates.push(`requirements = $${paramIndex++}`);
            values.push(JSON.stringify(data.requirements));
        }
        if (data.features !== undefined) {
            updates.push(`features = $${paramIndex++}`);
            values.push(JSON.stringify(data.features));
        }
        if (data.install_guide !== undefined) {
            updates.push(`install_guide = $${paramIndex++}`);
            values.push(data.install_guide);
        }
        if (data.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(data.metadata));
        }
        if (data.changelog !== undefined) {
            updates.push(`changelog = $${paramIndex++}`);
            values.push(data.changelog);
        }
        if (data.license !== undefined) {
            updates.push(`license = $${paramIndex++}`);
            values.push(data.license);
        }
        if (data.author_contact !== undefined) {
            updates.push(`author_contact = $${paramIndex++}`);
            values.push(data.author_contact);
        }
        if (data.support_url !== undefined) {
            updates.push(`support_url = $${paramIndex++}`);
            values.push(data.support_url);
        }
        if (data.screenshots !== undefined) {
            updates.push(`screenshots = $${paramIndex++}`);
            values.push(JSON.stringify(data.screenshots));
        }
        if (data.platform_requirements !== undefined) {
            updates.push(`platform_requirements = $${paramIndex++}`);
            values.push(JSON.stringify(data.platform_requirements));
        }
        if (data.ownership_declaration !== undefined) {
            updates.push(`ownership_declaration = $${paramIndex++}`);
            values.push(data.ownership_declaration);
        }
        if (data.ownership_proof_url !== undefined) {
            updates.push(`ownership_proof_url = $${paramIndex++}`);
            values.push(data.ownership_proof_url);
        }
        if (data.terms_accepted_at !== undefined) {
            updates.push(`terms_accepted_at = $${paramIndex++}`);
            values.push(data.terms_accepted_at);
        }

        // Handle review_status, reviewed_at, reviewed_by, rejection_reason, security_scan_* (for admin)
        // These fields are managed by admin/service, not through regular UpdateProductInput
        const adminData = data as any;
        if (adminData.review_status !== undefined) {
            updates.push(`review_status = $${paramIndex++}`);
            values.push(adminData.review_status);
        }
        if (adminData.reviewed_at !== undefined) {
            updates.push(`reviewed_at = $${paramIndex++}`);
            values.push(adminData.reviewed_at);
        }
        if (adminData.reviewed_by !== undefined) {
            updates.push(`reviewed_by = $${paramIndex++}`);
            values.push(adminData.reviewed_by);
        }
        if (adminData.rejection_reason !== undefined) {
            updates.push(`rejection_reason = $${paramIndex++}`);
            values.push(adminData.rejection_reason);
        }
        if (adminData.security_scan_status !== undefined) {
            updates.push(`security_scan_status = $${paramIndex++}`);
            values.push(adminData.security_scan_status);
        }
        if (adminData.security_scan_result !== undefined) {
            updates.push(`security_scan_result = $${paramIndex++}`);
            values.push(JSON.stringify(adminData.security_scan_result));
        }
        if (adminData.security_scan_at !== undefined) {
            updates.push(`security_scan_at = $${paramIndex++}`);
            values.push(adminData.security_scan_at);
        }

        if (updates.length === 0) return null;

        // updated_at is handled by trigger
        values.push(id);

        const result = await pool.query(
            `UPDATE products SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *`,
            values
        );

        if (!result.rows[0]) return null;
        return this.postProcessProduct(this.mapRowToProduct(result.rows[0]));
    }

    /**
     * Delete product
     */
    async delete(id: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM products WHERE id = $1',
            [id]
        );
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Increment download count
     */
    async incrementDownloads(id: string): Promise<void> {
        await pool.query(
            'UPDATE products SET downloads = downloads + 1 WHERE id = $1',
            [id]
        );
    }

    /**
     * Increment sales count
     */
    async incrementSales(id: string, delta: number = 1): Promise<void> {
        await pool.query(
            'UPDATE products SET sales_count = sales_count + $1 WHERE id = $2',
            [delta, id]
        );
    }

    /**
     * Map database row to Product type
     * Uses utility functions for automatic JSON parsing and type conversion
     */
    private mapRowToProduct(row: any): Product {
        return mapDbRow<Product>(
            row,
            [], // No generic JSON fields
            ['tags', 'requirements', 'features', 'screenshots'], // JSON array fields
            ['metadata', 'platform_requirements', 'security_scan_result'], // JSON object fields
            ['downloads', 'rating', 'reviews_count', 'sales_count'] // Number fields (price handled separately)
        );
    }
    
    /**
     * Post-process mapped product (handle special cases)
     */
    private postProcessProduct(product: Product): Product {
        return {
            ...product,
            type: product.type as ProductType,
            status: product.status as ProductStatus,
            review_status: product.review_status as ProductReviewStatus,
            price_type: product.price_type,
            currency: product.currency || 'VND',
            price: product.price ? parseNumber(product.price) : undefined,
            rating: parseNumber(product.rating, 0),
            downloads: parseNumber(product.downloads, 0),
            reviews_count: parseNumber(product.reviews_count, 0),
            sales_count: parseNumber(product.sales_count, 0),
            reviewed_at: product.reviewed_at || null,
            reviewed_by: product.reviewed_by || null,
            rejection_reason: product.rejection_reason || null,
        };
    }
}

export default new ProductRepository();

