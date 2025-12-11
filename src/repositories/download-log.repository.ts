import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type DownloadLogType = 'free' | 'manual';

export type DownloadLogRecord = {
    id: string;
    product_id: string;
    seller_id: string;
    buyer_id?: string | null;
    type: DownloadLogType;
    created_at: Date;
};

export class DownloadLogRepository {
    async create(data: {
        product_id: string;
        seller_id: string;
        buyer_id?: string | null;
        type: DownloadLogType;
    }): Promise<DownloadLogRecord> {
        const id = uuidv4();
        const now = new Date();
        const result = await pool.query(
            `INSERT INTO download_logs (id, product_id, seller_id, buyer_id, type, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [id, data.product_id, data.seller_id, data.buyer_id || null, data.type, now]
        );
        return result.rows[0];
    }
}

export default new DownloadLogRepository();


