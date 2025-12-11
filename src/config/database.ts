import { Pool } from 'pg';
import { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } from './env';

const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
    console.log('✅ Database connected');
});

// Improved error handling - don't exit immediately
pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
    // Log error but don't exit - allow retry logic or graceful shutdown
    // The application should handle this gracefully
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing database pool...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, closing database pool...');
    await pool.end();
    process.exit(0);
});

/**
 * Check database health
 * @returns true if database is healthy, false otherwise
 */
export async function checkDatabaseHealth(): Promise<boolean> {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}

export default pool;
