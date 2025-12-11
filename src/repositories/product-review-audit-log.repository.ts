import pool from '../config/database';
import { ProductReviewAuditLog, CreateProductReviewAuditLogInput } from '@gsnake/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { mapDbRow } from '../utils/db-mapper';

export class ProductReviewAuditLogRepository {
    /**
     * Find audit logs by product ID
     */
    async findByProductId(productId: string): Promise<ProductReviewAuditLog[]> {
        const result = await pool.query(
            'SELECT * FROM product_review_audit_log WHERE product_id = $1 ORDER BY created_at DESC',
            [productId]
        );
        return result.rows.map(row => this.mapRowToAuditLog(row));
    }

    /**
     * Find audit logs by reviewer ID
     */
    async findByReviewerId(reviewerId: string): Promise<ProductReviewAuditLog[]> {
        const result = await pool.query(
            'SELECT * FROM product_review_audit_log WHERE reviewer_id = $1 ORDER BY created_at DESC',
            [reviewerId]
        );
        return result.rows.map(row => this.mapRowToAuditLog(row));
    }

    /**
     * Create audit log
     */
    async create(data: CreateProductReviewAuditLogInput): Promise<ProductReviewAuditLog> {
        const id = uuidv4();
        const now = new Date();

        const result = await pool.query(
            `INSERT INTO product_review_audit_log (
                id, product_id, reviewer_id, action, review_status_before, review_status_after,
                reason, checklist_items, notes, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
            ) RETURNING *`,
            [
                id,
                data.product_id,
                data.reviewer_id,
                data.action,
                data.review_status_before || null,
                data.review_status_after || null,
                data.reason || null,
                data.checklist_items ? JSON.stringify(data.checklist_items) : '{}',
                data.notes || null,
                now,
            ]
        );

        return this.mapRowToAuditLog(result.rows[0]);
    }

    /**
     * Map database row to ProductReviewAuditLog
     */
    private mapRowToAuditLog(row: any): ProductReviewAuditLog {
        return mapDbRow<ProductReviewAuditLog>(
            row,
            [], // No generic JSON fields
            [], // No JSON array fields
            ['checklist_items'], // JSON object fields
            [] // No number fields
        );
    }
}

export default new ProductReviewAuditLogRepository();

