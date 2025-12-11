import pool from '../config/database';
import { FetchSchedule, CreateScheduleInput, SourceType } from '@gsnake/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { mapDbRow } from '../utils/db-mapper';

export class ScheduleRepository {
    /**
     * Find all schedules by user ID
     */
    async findByUserId(userId: string): Promise<FetchSchedule[]> {
        const result = await pool.query(
            'SELECT * FROM fetch_schedules WHERE user_id = $1 ORDER BY next_fetch ASC',
            [userId]
        );
        return result.rows;
    }

    /**
     * Find schedule by ID
     */
    async findById(id: string): Promise<FetchSchedule | null> {
        const result = await pool.query(
            'SELECT * FROM fetch_schedules WHERE id = $1',
            [id]
        );
        return result.rows[0] ? this.mapRowToSchedule(result.rows[0]) : null;
    }

    /**
     * Find due schedules (next_fetch <= now) and active
     */
    async findDue(): Promise<FetchSchedule[]> {
        const result = await pool.query(
            'SELECT * FROM fetch_schedules WHERE next_fetch <= NOW() AND active = true ORDER BY next_fetch ASC'
        );
        return result.rows;
    }

    /**
     * Create schedule
     */
    async create(data: CreateScheduleInput & { next_fetch?: Date; active?: boolean }): Promise<FetchSchedule> {
        const id = uuidv4();

        const result = await pool.query(
            `INSERT INTO fetch_schedules (id, user_id, source_type, source_value, frequency, next_fetch, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [
                id,
                data.user_id,
                data.source_type,
                data.source_value,
                data.frequency,
                data.next_fetch,
                data.active !== undefined ? data.active : true
            ]
        );

        return this.mapRowToSchedule(result.rows[0]);
    }

    /**
     * Update schedule
     */
    async update(
        id: string,
        data: Partial<{
            frequency: string;
            last_fetched: Date;
            next_fetch: Date;
            workflow_id: string;
            active: boolean;
        }>
    ): Promise<FetchSchedule | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.frequency !== undefined) {
            updates.push(`frequency = $${paramIndex++}`);
            values.push(data.frequency);
            // Note: next_fetch recalculation should be handled by service (business logic)
        }
        if (data.last_fetched !== undefined) {
            updates.push(`last_fetched = $${paramIndex++}`);
            values.push(data.last_fetched);
        }
        if (data.next_fetch !== undefined) {
            updates.push(`next_fetch = $${paramIndex++}`);
            values.push(data.next_fetch);
        }
        if (data.workflow_id !== undefined) {
            updates.push(`workflow_id = $${paramIndex++}`);
            values.push(data.workflow_id);
        }
        if (data.active !== undefined) {
            updates.push(`active = $${paramIndex++}`);
            values.push(data.active);
        }

        if (updates.length === 0) return null;

        values.push(id);

        const result = await pool.query(
            `UPDATE fetch_schedules SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
            values
        );

        return result.rows[0] ? this.mapRowToSchedule(result.rows[0]) : null;
    }

    /**
     * Delete schedule
     */
    async delete(id: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM fetch_schedules WHERE id = $1',
            [id]
        );
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Map database row to FetchSchedule type
     */
    private mapRowToSchedule(row: any): FetchSchedule {
        return mapDbRow<FetchSchedule>(
            row,
            [],
            [],
            [],
            []
        );
    }
}

export default new ScheduleRepository();
