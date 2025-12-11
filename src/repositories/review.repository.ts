import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Review, CreateReviewInput, UpdateReviewInput, ReviewQueryFilters, ReviewStatus } from '@gsnake/shared-types';

export class ReviewRepository {
    async findMany(filters: ReviewQueryFilters = {}): Promise<{ reviews: Review[]; total: number }> {
        const conditions: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (filters.product_id) {
            conditions.push(`product_id = $${idx++}`);
            values.push(filters.product_id);
        }
        if (filters.user_id) {
            conditions.push(`user_id = $${idx++}`);
            values.push(filters.user_id);
        }
        if (filters.status) {
            conditions.push(`status = $${idx++}`);
            values.push(filters.status);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;

        const totalResult = await pool.query(
            `SELECT COUNT(*) as total FROM reviews ${whereClause}`,
            values
        );
        const total = parseInt(totalResult.rows[0].total, 10);

        values.push(limit, offset);
        const result = await pool.query(
            `SELECT * FROM reviews ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
            values
        );

        return {
            reviews: result.rows,
            total,
        };
    }

    async findById(id: string): Promise<Review | null> {
        const result = await pool.query('SELECT * FROM reviews WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    async create(data: CreateReviewInput): Promise<Review> {
        const id = uuidv4();
        const now = new Date();
        const status = data.status || ReviewStatus.PENDING;

        const result = await pool.query(
            `INSERT INTO reviews (id, product_id, user_id, rating, content, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [id, data.product_id, data.user_id, data.rating, data.content || null, status, now, now]
        );

        return result.rows[0];
    }

    async update(id: string, data: UpdateReviewInput): Promise<Review | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (data.rating !== undefined) {
            updates.push(`rating = $${idx++}`);
            values.push(data.rating);
        }
        if (data.content !== undefined) {
            updates.push(`content = $${idx++}`);
            values.push(data.content);
        }
        if (data.status !== undefined) {
            updates.push(`status = $${idx++}`);
            values.push(data.status);
        }

        if (!updates.length) return null;

        updates.push(`updated_at = $${idx++}`);
        values.push(new Date());
        values.push(id);

        const result = await pool.query(
            `UPDATE reviews SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        return result.rows[0] || null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    async getAggregates(productId: string): Promise<{ avg: number; count: number }> {
        const result = await pool.query(
            `SELECT COALESCE(AVG(rating), 0) as avg, COUNT(*) as count
             FROM reviews
             WHERE product_id = $1 AND status = $2`,
            [productId, ReviewStatus.APPROVED]
        );
        return {
            avg: parseFloat(result.rows[0].avg),
            count: parseInt(result.rows[0].count, 10),
        };
    }
}

export default new ReviewRepository();


