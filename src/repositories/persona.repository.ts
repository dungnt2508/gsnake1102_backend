import pool from '../config/database';
import { Persona, CreatePersonaInput, UpdatePersonaInput } from '@gsnake/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { mapDbRow, parseJsonArray } from '../utils/db-mapper';

export class PersonaRepository {
    /**
     * Find persona by user ID
     */
    async findByUserId(userId: string): Promise<Persona | null> {
        const result = await pool.query(
            'SELECT * FROM personas WHERE user_id = $1',
            [userId]
        );
        return result.rows[0] ? this.mapRowToPersona(result.rows[0]) : null;
    }

    /**
     * Find persona by ID
     */
    async findById(id: string): Promise<Persona | null> {
        const result = await pool.query(
            'SELECT * FROM personas WHERE id = $1',
            [id]
        );
        return result.rows[0] ? this.mapRowToPersona(result.rows[0]) : null;
    }

    /**
     * Create persona
     */
    async create(data: CreatePersonaInput): Promise<Persona> {
        const id = uuidv4();
        const now = new Date();

        const result = await pool.query(
            `INSERT INTO personas (id, user_id, language_style, tone, topics_interest, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [
                id,
                data.user_id,
                data.language_style,
                data.tone,
                data.topics_interest ? JSON.stringify(data.topics_interest) : '[]',
                now,
                now,
            ]
        );

        return result.rows[0];
    }

    /**
     * Update persona
     */
    async update(userId: string, data: UpdatePersonaInput): Promise<Persona | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.language_style !== undefined) {
            updates.push(`language_style = $${paramIndex++}`);
            values.push(data.language_style);
        }
        if (data.tone !== undefined) {
            updates.push(`tone = $${paramIndex++}`);
            values.push(data.tone);
        }
        if (data.topics_interest !== undefined) {
            updates.push(`topics_interest = $${paramIndex++}`);
            values.push(data.topics_interest ? JSON.stringify(data.topics_interest) : '[]');
        }

        if (updates.length === 0) return null;

        updates.push(`updated_at = $${paramIndex++}`);
        values.push(new Date());
        values.push(userId);

        const result = await pool.query(
            `UPDATE personas SET ${updates.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
            values
        );

        return result.rows[0] ? this.mapRowToPersona(result.rows[0]) : null;
    }

    /**
     * Delete persona
     */
    async delete(userId: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM personas WHERE user_id = $1',
            [userId]
        );
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Map database row to Persona type
     */
    private mapRowToPersona(row: any): Persona {
        return mapDbRow<Persona>(
            row,
            [],
            ['topics_interest'], // JSON array field
            [],
            []
        );
    }
}

export default new PersonaRepository();
