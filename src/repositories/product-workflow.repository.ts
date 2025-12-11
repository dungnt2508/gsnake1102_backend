import pool from '../config/database';
import { ProductWorkflow, CreateProductWorkflowInput, UpdateProductWorkflowInput } from '@gsnake/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { mapDbRow, parseNumber } from '../utils/db-mapper';

export class ProductWorkflowRepository {
    /**
     * Find workflow by product ID
     */
    async findByProductId(productId: string): Promise<ProductWorkflow | null> {
        const result = await pool.query(
            'SELECT * FROM product_workflows WHERE product_id = $1',
            [productId]
        );
        if (!result.rows[0]) return null;
        return this.mapRowToWorkflow(result.rows[0]);
    }

    /**
     * Find workflow by ID
     */
    async findById(id: string): Promise<ProductWorkflow | null> {
        const result = await pool.query(
            'SELECT * FROM product_workflows WHERE id = $1',
            [id]
        );
        if (!result.rows[0]) return null;
        return this.mapRowToWorkflow(result.rows[0]);
    }

    /**
     * Create workflow
     */
    async create(data: CreateProductWorkflowInput): Promise<ProductWorkflow> {
        const id = uuidv4();
        const now = new Date();

        const result = await pool.query(
            `INSERT INTO product_workflows (
                id, product_id, n8n_version, workflow_json_url, env_example_url, readme_url,
                workflow_file_checksum, nodes_count, triggers, credentials_required, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            ) RETURNING *`,
            [
                id,
                data.product_id,
                data.n8n_version || null,
                data.workflow_json_url || null,
                data.env_example_url || null,
                data.readme_url || null,
                data.workflow_file_checksum || null,
                data.nodes_count || null,
                data.triggers ? JSON.stringify(data.triggers) : '[]',
                data.credentials_required ? JSON.stringify(data.credentials_required) : '[]',
                now,
                now,
            ]
        );

        return this.mapRowToWorkflow(result.rows[0]);
    }

    /**
     * Update workflow
     */
    async update(productId: string, data: UpdateProductWorkflowInput): Promise<ProductWorkflow | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.n8n_version !== undefined) {
            updates.push(`n8n_version = $${paramIndex++}`);
            values.push(data.n8n_version);
        }
        if (data.workflow_json_url !== undefined) {
            updates.push(`workflow_json_url = $${paramIndex++}`);
            values.push(data.workflow_json_url);
        }
        if (data.env_example_url !== undefined) {
            updates.push(`env_example_url = $${paramIndex++}`);
            values.push(data.env_example_url);
        }
        if (data.readme_url !== undefined) {
            updates.push(`readme_url = $${paramIndex++}`);
            values.push(data.readme_url);
        }
        if (data.workflow_file_checksum !== undefined) {
            updates.push(`workflow_file_checksum = $${paramIndex++}`);
            values.push(data.workflow_file_checksum);
        }
        if (data.nodes_count !== undefined) {
            updates.push(`nodes_count = $${paramIndex++}`);
            values.push(data.nodes_count);
        }
        if (data.triggers !== undefined) {
            updates.push(`triggers = $${paramIndex++}`);
            values.push(JSON.stringify(data.triggers));
        }
        if (data.credentials_required !== undefined) {
            updates.push(`credentials_required = $${paramIndex++}`);
            values.push(JSON.stringify(data.credentials_required));
        }

        if (updates.length === 0) return null;

        // updated_at is handled by trigger
        values.push(productId);

        const result = await pool.query(
            `UPDATE product_workflows SET ${updates.join(', ')}
            WHERE product_id = $${paramIndex}
            RETURNING *`,
            values
        );

        if (!result.rows[0]) return null;
        return this.mapRowToWorkflow(result.rows[0]);
    }

    /**
     * Delete workflow
     */
    async delete(productId: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM product_workflows WHERE product_id = $1',
            [productId]
        );
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Map database row to ProductWorkflow
     */
    private mapRowToWorkflow(row: any): ProductWorkflow {
        return mapDbRow<ProductWorkflow>(
            row,
            [], // No generic JSON fields
            ['triggers', 'credentials_required'], // JSON array fields
            [], // No JSON object fields
            ['nodes_count'] // Number fields
        );
    }
}

export default new ProductWorkflowRepository();

