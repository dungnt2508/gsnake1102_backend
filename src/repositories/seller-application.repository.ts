import pool from '../config/database';
import { SellerApplication, SellerStatus } from '@gsnake/shared-types';
import { v4 as uuidv4 } from 'uuid';

export class SellerApplicationRepository {
    /**
     * Find application by user ID
     */
    async findByUserId(userId: string): Promise<SellerApplication | null> {
        const result = await pool.query(
            'SELECT * FROM seller_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Find application by ID
     */
    async findById(id: string): Promise<SellerApplication | null> {
        const result = await pool.query(
            'SELECT * FROM seller_applications WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Find all applications by status
     */
    async findByStatus(status: SellerStatus): Promise<SellerApplication[]> {
        const result = await pool.query(
            'SELECT * FROM seller_applications WHERE status = $1 ORDER BY created_at DESC',
            [status]
        );
        return result.rows;
    }

    /**
     * Find all applications
     */
    async findAll(): Promise<SellerApplication[]> {
        const result = await pool.query(
            'SELECT * FROM seller_applications ORDER BY created_at DESC'
        );
        return result.rows;
    }

    /**
     * Create new application
     */
    async create(data: {
        user_id: string;
        application_data?: Record<string, any>;
    }): Promise<SellerApplication> {
        const id = uuidv4();
        const now = new Date();

        const result = await pool.query(
            `INSERT INTO seller_applications (id, user_id, application_data, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [id, data.user_id, JSON.stringify(data.application_data || {}), SellerStatus.PENDING, now, now]
        );

        return result.rows[0];
    }

    /**
     * Update application
     */
    async update(id: string, data: {
        status?: SellerStatus;
        reviewed_at?: Date | null;
        reviewed_by?: string | null;
        rejection_reason?: string | null;
    }): Promise<SellerApplication | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(data.status);
        }
        if (data.reviewed_at !== undefined) {
            updates.push(`reviewed_at = $${paramIndex++}`);
            values.push(data.reviewed_at);
        }
        if (data.reviewed_by !== undefined) {
            updates.push(`reviewed_by = $${paramIndex++}`);
            values.push(data.reviewed_by);
        }
        if (data.rejection_reason !== undefined) {
            updates.push(`rejection_reason = $${paramIndex++}`);
            values.push(data.rejection_reason);
        }

        if (updates.length === 0) return null;

        updates.push(`updated_at = $${paramIndex++}`);
        values.push(new Date());
        values.push(id);

        const result = await pool.query(
            `UPDATE seller_applications SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
            values
        );

        return result.rows[0] || null;
    }
}

export default new SellerApplicationRepository();

