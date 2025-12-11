import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type AuthProviderRecord = {
    id: string;
    user_id: string;
    provider: string;
    provider_user_id: string;
    access_token?: string | null;
    refresh_token?: string | null;
    created_at: Date;
    updated_at: Date;
};

export class AuthProviderRepository {
    async findByProviderUser(provider: string, providerUserId: string): Promise<AuthProviderRecord | null> {
        const result = await pool.query(
            'SELECT * FROM auth_providers WHERE provider = $1 AND provider_user_id = $2 LIMIT 1',
            [provider, providerUserId]
        );
        return result.rows[0] || null;
    }

    async findByUserAndProvider(userId: string, provider: string): Promise<AuthProviderRecord | null> {
        const result = await pool.query(
            'SELECT * FROM auth_providers WHERE user_id = $1 AND provider = $2 LIMIT 1',
            [userId, provider]
        );
        return result.rows[0] || null;
    }

    async upsert(data: {
        user_id: string;
        provider: string;
        provider_user_id: string;
        access_token?: string | null;
        refresh_token?: string | null;
    }): Promise<AuthProviderRecord> {
        const now = new Date();
        const id = uuidv4();

        const result = await pool.query(
            `INSERT INTO auth_providers (
                id, user_id, provider, provider_user_id, access_token, refresh_token, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8
            )
            ON CONFLICT (provider, provider_user_id) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                updated_at = EXCLUDED.updated_at
            RETURNING *`,
            [
                id,
                data.user_id,
                data.provider,
                data.provider_user_id,
                data.access_token || null,
                data.refresh_token || null,
                now,
                now,
            ]
        );

        return result.rows[0];
    }
}

export default new AuthProviderRepository();

