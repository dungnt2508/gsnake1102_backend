import pool from '../config/database';
import { User, CreateUserInput, UserRole, SellerStatus } from '@gsnake/shared-types';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository {
    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User | null> {
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Find user by Azure ID
     */
    async findByAzureId(azureId: string): Promise<User | null> {
        const result = await pool.query(
            'SELECT * FROM users WHERE azure_id = $1',
            [azureId]
        );
        return result.rows[0] || null;
    }

    /**
     * Create new user
     */
    async create(data: CreateUserInput & { role?: UserRole; password?: string | null }): Promise<User> {
        const id = uuidv4();
        const now = new Date();
        const role = data.role || UserRole.USER;
        const passwordHash = data.password ?? null;

        const result = await pool.query(
            `INSERT INTO users (id, email, password_hash, azure_id, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [id, data.email, passwordHash, data.azure_id, role, now, now]
        );

        return result.rows[0];
    }

    /**
     * Update user
     */
    async update(id: string, data: Partial<CreateUserInput & {
        role?: UserRole;
        seller_status?: SellerStatus | null;
        seller_approved_at?: Date | null;
        seller_approved_by?: string | null;
        seller_rejection_reason?: string | null;
    }>): Promise<User | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            values.push(data.email);
        }
        if (data.password !== undefined) {
            updates.push(`password_hash = $${paramIndex++}`);
            values.push(data.password);
        }
        if (data.azure_id !== undefined) {
            updates.push(`azure_id = $${paramIndex++}`);
            values.push(data.azure_id);
        }
        if (data.role !== undefined) {
            updates.push(`role = $${paramIndex++}`);
            values.push(data.role);
        }
        if (data.seller_status !== undefined) {
            updates.push(`seller_status = $${paramIndex++}`);
            values.push(data.seller_status);
        }
        if (data.seller_approved_at !== undefined) {
            updates.push(`seller_approved_at = $${paramIndex++}`);
            values.push(data.seller_approved_at);
        }
        if (data.seller_approved_by !== undefined) {
            updates.push(`seller_approved_by = $${paramIndex++}`);
            values.push(data.seller_approved_by);
        }
        if (data.seller_rejection_reason !== undefined) {
            updates.push(`seller_rejection_reason = $${paramIndex++}`);
            values.push(data.seller_rejection_reason);
        }

        if (updates.length === 0) return null;

        updates.push(`updated_at = $${paramIndex++}`);
        values.push(new Date());
        values.push(id);

        const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
            values
        );

        return result.rows[0] || null;
    }

    /**
     * Find users by role
     */
    async findByRole(role: UserRole): Promise<User[]> {
        const result = await pool.query(
            'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC',
            [role]
        );
        return result.rows;
    }

    /**
     * Find sellers by status
     */
    async findSellersByStatus(status: SellerStatus): Promise<User[]> {
        const result = await pool.query(
            'SELECT * FROM users WHERE seller_status = $1 ORDER BY created_at DESC',
            [status]
        );
        return result.rows;
    }

    /**
     * Find all sellers (pending, approved, rejected)
     */
    async findAllSellers(): Promise<User[]> {
        const result = await pool.query(
            'SELECT * FROM users WHERE seller_status IS NOT NULL ORDER BY created_at DESC'
        );
        return result.rows;
    }

    /**
     * Delete user
     */
    async delete(id: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1',
            [id]
        );
        return result.rowCount ? result.rowCount > 0 : false;
    }
}

export default new UserRepository();
