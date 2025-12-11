import pool from '../config/database';
import { ProductArtifact, CreateProductArtifactInput, UpdateProductArtifactInput } from '@gsnake/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { mapDbRow, parseNumber } from '../utils/db-mapper';

export class ProductArtifactRepository {
    /**
     * Find all artifacts for a product
     */
    async findByProductId(productId: string): Promise<ProductArtifact[]> {
        const result = await pool.query(
            'SELECT * FROM product_artifacts WHERE product_id = $1 ORDER BY created_at DESC',
            [productId]
        );
        return result.rows.map(row => this.mapRowToArtifact(row));
    }

    /**
     * Find artifact by ID
     */
    async findById(id: string): Promise<ProductArtifact | null> {
        const result = await pool.query(
            'SELECT * FROM product_artifacts WHERE id = $1',
            [id]
        );
        if (!result.rows[0]) return null;
        return this.mapRowToArtifact(result.rows[0]);
    }

    /**
     * Find primary artifact for a product
     */
    async findPrimaryByProductId(productId: string): Promise<ProductArtifact | null> {
        const result = await pool.query(
            'SELECT * FROM product_artifacts WHERE product_id = $1 AND is_primary = true LIMIT 1',
            [productId]
        );
        if (!result.rows[0]) return null;
        return this.mapRowToArtifact(result.rows[0]);
    }

    /**
     * Find artifacts by type for a product
     */
    async findByProductIdAndType(productId: string, artifactType: string): Promise<ProductArtifact[]> {
        const result = await pool.query(
            'SELECT * FROM product_artifacts WHERE product_id = $1 AND artifact_type = $2 ORDER BY created_at DESC',
            [productId, artifactType]
        );
        return result.rows.map(row => this.mapRowToArtifact(row));
    }

    /**
     * Create artifact
     */
    async create(data: CreateProductArtifactInput): Promise<ProductArtifact> {
        const id = uuidv4();
        const now = new Date();

        const result = await pool.query(
            `INSERT INTO product_artifacts (
                id, product_id, artifact_type, file_name, file_url, file_size,
                mime_type, checksum, version, is_primary, metadata, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            ) RETURNING *`,
            [
                id,
                data.product_id,
                data.artifact_type,
                data.file_name,
                data.file_url,
                data.file_size || null,
                data.mime_type || null,
                data.checksum || null,
                data.version || null,
                data.is_primary || false,
                data.metadata ? JSON.stringify(data.metadata) : '{}',
                now,
                now,
            ]
        );

        return this.mapRowToArtifact(result.rows[0]);
    }

    /**
     * Update artifact
     */
    async update(id: string, data: UpdateProductArtifactInput): Promise<ProductArtifact | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.artifact_type !== undefined) {
            updates.push(`artifact_type = $${paramIndex++}`);
            values.push(data.artifact_type);
        }
        if (data.file_name !== undefined) {
            updates.push(`file_name = $${paramIndex++}`);
            values.push(data.file_name);
        }
        if (data.file_url !== undefined) {
            updates.push(`file_url = $${paramIndex++}`);
            values.push(data.file_url);
        }
        if (data.file_size !== undefined) {
            updates.push(`file_size = $${paramIndex++}`);
            values.push(data.file_size);
        }
        if (data.mime_type !== undefined) {
            updates.push(`mime_type = $${paramIndex++}`);
            values.push(data.mime_type);
        }
        if (data.checksum !== undefined) {
            updates.push(`checksum = $${paramIndex++}`);
            values.push(data.checksum);
        }
        if (data.version !== undefined) {
            updates.push(`version = $${paramIndex++}`);
            values.push(data.version);
        }
        if (data.is_primary !== undefined) {
            updates.push(`is_primary = $${paramIndex++}`);
            values.push(data.is_primary);
        }
        if (data.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(data.metadata));
        }

        if (updates.length === 0) return null;

        // updated_at is handled by trigger
        values.push(id);

        const result = await pool.query(
            `UPDATE product_artifacts SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *`,
            values
        );

        if (!result.rows[0]) return null;
        return this.mapRowToArtifact(result.rows[0]);
    }

    /**
     * Delete artifact
     */
    async delete(id: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM product_artifacts WHERE id = $1',
            [id]
        );
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Delete all artifacts for a product
     */
    async deleteByProductId(productId: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM product_artifacts WHERE product_id = $1',
            [productId]
        );
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Map database row to ProductArtifact
     */
    private mapRowToArtifact(row: any): ProductArtifact {
        return mapDbRow<ProductArtifact>(
            row,
            [], // No generic JSON fields
            [], // No JSON array fields
            ['metadata'], // JSON object fields
            ['file_size'] // Number fields
        );
    }
}

export default new ProductArtifactRepository();

