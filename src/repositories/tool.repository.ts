import pool from '../config/database';
import { ToolRequest, CreateToolRequestInput, ToolRequestStatus } from '@gsnake/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { mapDbRow, parseJsonObject } from '../utils/db-mapper';

export class ToolRepository {
    /**
     * Find all tool requests by user ID
     */
    async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<ToolRequest[]> {
        const result = await pool.query(
            'SELECT * FROM tool_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [userId, limit, offset]
        );
        return result.rows.map(row => this.mapRowToToolRequest(row));
    }

    /**
     * Find tool request by ID
     */
    async findById(id: string): Promise<ToolRequest | null> {
        const result = await pool.query(
            'SELECT * FROM tool_requests WHERE id = $1',
            [id]
        );
        return result.rows[0] ? this.mapRowToToolRequest(result.rows[0]) : null;
    }

    /**
     * Find pending tool requests
     */
    async findPending(): Promise<ToolRequest[]> {
        const result = await pool.query(
            'SELECT * FROM tool_requests WHERE status = $1 ORDER BY created_at ASC',
            [ToolRequestStatus.PENDING]
        );
        return result.rows.map(row => this.mapRowToToolRequest(row));
    }

    /**
     * Create tool request
     */
    async create(data: CreateToolRequestInput & { status?: ToolRequestStatus }): Promise<ToolRequest> {
        const id = uuidv4();
        const now = new Date();

        const result = await pool.query(
            `INSERT INTO tool_requests (id, user_id, request_payload, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [
                id,
                data.user_id,
                data.request_payload ? JSON.stringify(data.request_payload) : '{}',
                data.status || ToolRequestStatus.PENDING,
                now,
                now,
            ]
        );

        return result.rows[0];
    }

    /**
     * Update tool request
     */
    async update(
        id: string,
        data: Partial<{
            status: ToolRequestStatus;
            result: Record<string, any>;
            workflow_id: string;
        }>
    ): Promise<ToolRequest | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(data.status);
        }
        if (data.result !== undefined) {
            updates.push(`result = $${paramIndex++}`);
            values.push(data.result ? JSON.stringify(data.result) : '{}');
        }
        if (data.workflow_id !== undefined) {
            updates.push(`workflow_id = $${paramIndex++}`);
            values.push(data.workflow_id);
        }

        if (updates.length === 0) return null;

        updates.push(`updated_at = $${paramIndex++}`);
        values.push(new Date());
        values.push(id);

        const result = await pool.query(
            `UPDATE tool_requests SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
            values
        );

        return result.rows[0] ? this.mapRowToToolRequest(result.rows[0]) : null;
    }

    /**
     * Delete tool request
     */
    async delete(id: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM tool_requests WHERE id = $1',
            [id]
        );
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Map database row to ToolRequest type
     */
    private mapRowToToolRequest(row: any): ToolRequest {
        return mapDbRow<ToolRequest>(
            row,
            [],
            [],
            ['request_payload', 'result'], // JSON object fields
            []
        );
    }
}

export default new ToolRepository();
