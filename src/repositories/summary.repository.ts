import pool from '../config/database';
import { Summary, CreateSummaryInput } from '@gsnake/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { mapDbRow, parseJsonArray } from '../utils/db-mapper';

export class SummaryRepository {
    /**
     * Find summary by Article ID
     */
    async findByArticleId(articleId: string): Promise<Summary | null> {
        const result = await pool.query(
            'SELECT * FROM summaries WHERE article_id = $1',
            [articleId]
        );
        return result.rows[0] ? this.mapRowToSummary(result.rows[0]) : null;
    }

    /**
     * Create summary
     */
    async create(data: CreateSummaryInput): Promise<Summary> {
        const id = uuidv4();
        const now = new Date();

        const result = await pool.query(
            `INSERT INTO summaries (id, article_id, summary_text, insights_json, data_points_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [
                id,
                data.article_id,
                data.summary_text,
                data.insights_json ? JSON.stringify(data.insights_json) : '[]',
                data.data_points_json ? JSON.stringify(data.data_points_json) : '[]',
                now
            ]
        );

        return result.rows[0];
    }

    /**
     * Update summary
     */
    async update(
        id: string,
        data: Partial<{
            summary_text: string;
            insights_json: any[];
            data_points_json: any[];
        }>
    ): Promise<Summary | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.summary_text !== undefined) {
            updates.push(`summary_text = $${paramIndex++}`);
            values.push(data.summary_text);
        }
        if (data.insights_json !== undefined) {
            updates.push(`insights_json = $${paramIndex++}`);
            values.push(data.insights_json ? JSON.stringify(data.insights_json) : '[]');
        }
        if (data.data_points_json !== undefined) {
            updates.push(`data_points_json = $${paramIndex++}`);
            values.push(data.data_points_json ? JSON.stringify(data.data_points_json) : '[]');
        }

        if (updates.length === 0) return null;

        values.push(id);

        const result = await pool.query(
            `UPDATE summaries SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
            values
        );

        return result.rows[0] ? this.mapRowToSummary(result.rows[0]) : null;
    }

    /**
     * Map database row to Summary type
     */
    private mapRowToSummary(row: any): Summary {
        return mapDbRow<Summary>(
            row,
            [],
            ['insights_json', 'data_points_json'], // JSON array fields
            [],
            []
        );
    }
}

export default new SummaryRepository();
