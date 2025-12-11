import pool from '../config/database';
import { Article, CreateArticleInput, ArticleStatus, SourceType } from '@gsnake/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { mapDbRow, parseJsonObject } from '../utils/db-mapper';

export class ArticleRepository {
    /**
     * Find all articles by user ID
     */
    async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<Article[]> {
        const result = await pool.query(
            'SELECT * FROM articles WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [userId, limit, offset]
        );
        return result.rows.map(row => this.mapRowToArticle(row));
    }

    /**
     * Find article by ID
     */
    async findById(id: string): Promise<Article | null> {
        const result = await pool.query(
            'SELECT * FROM articles WHERE id = $1',
            [id]
        );
        return result.rows[0] ? this.mapRowToArticle(result.rows[0]) : null;
    }

    /**
     * Find article by Source
     */
    async findBySource(type: SourceType, value: string): Promise<Article | null> {
        const result = await pool.query(
            'SELECT * FROM articles WHERE source_type = $1 AND source_value = $2',
            [type, value]
        );
        return result.rows[0] ? this.mapRowToArticle(result.rows[0]) : null;
    }

    /**
     * Find article by URL (Legacy support)
     */
    async findByUrl(url: string): Promise<Article | null> {
        const result = await pool.query(
            'SELECT * FROM articles WHERE url = $1 OR (source_type = $2 AND source_value = $1)',
            [url, SourceType.URL]
        );
        return result.rows[0] ? this.mapRowToArticle(result.rows[0]) : null;
    }

    /**
     * Create article
     */
    async create(data: CreateArticleInput & { status?: ArticleStatus }): Promise<Article> {
        const id = uuidv4();
        const now = new Date();

        const result = await pool.query(
            `INSERT INTO articles (id, user_id, source_type, source_value, title, url, metadata, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
            [
                id,
                data.user_id,
                data.source_type,
                data.source_value,
                data.title || null,
                data.url || null,
                data.metadata ? JSON.stringify(data.metadata) : '{}',
                data.status || ArticleStatus.PENDING,
                now
            ]
        );

        return result.rows[0];
    }

    /**
     * Update article
     */
    async update(
        id: string,
        data: Partial<{
            title: string;
            summary: string;
            source: string;
            raw_text: string;
            metadata: Record<string, any>;
            workflow_id: string;
            status: ArticleStatus;
        }>
    ): Promise<Article | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            values.push(data.title);
        }
        if (data.summary !== undefined) {
            updates.push(`summary = $${paramIndex++}`);
            values.push(data.summary);
        }
        if (data.source !== undefined) {
            updates.push(`source = $${paramIndex++}`);
            values.push(data.source);
        }
        if (data.raw_text !== undefined) {
            updates.push(`raw_text = $${paramIndex++}`);
            values.push(data.raw_text);
        }
        if (data.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(data.metadata ? JSON.stringify(data.metadata) : '{}');
        }
        if (data.workflow_id !== undefined) {
            updates.push(`workflow_id = $${paramIndex++}`);
            values.push(data.workflow_id);
        }
        if (data.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(data.status);
        }

        if (updates.length === 0) return null;

        values.push(id);

        const result = await pool.query(
            `UPDATE articles SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
            values
        );

        return result.rows[0] ? this.mapRowToArticle(result.rows[0]) : null;
    }

    /**
     * Delete article
     */
    async delete(id: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM articles WHERE id = $1',
            [id]
        );
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Map database row to Article type
     */
    private mapRowToArticle(row: any): Article {
        return mapDbRow<Article>(
            row,
            [],
            [],
            ['metadata'], // JSON object field
            []
        );
    }
}

export default new ArticleRepository();
