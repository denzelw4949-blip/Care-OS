import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

// Check if DB config is present
// Railway provides DATABASE_URL, local dev uses individual fields
const hasDbConfig = Boolean(process.env.DATABASE_URL || (config.database.host && config.database.user && config.database.host !== 'localhost'));

let pool;

if (hasDbConfig) {
    // Create database connection pool
    const poolConfig = process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
        : {
            host: config.database.host,
            port: config.database.port,
            database: config.database.name,
            user: config.database.user,
            password: config.database.password,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };

    pool = new Pool(poolConfig);

    // Error handling
    pool.on('error', (err) => {
        console.error('Unexpected database pool error:', err);
        // Don't exit process in demo mode
    });

    console.log('✅ Database pool initialized');
} else {
    console.warn('⚠️  No Database Configuration found. Running in MOCK DB mode.');
    // Mock pool for demo mode
    pool = {
        connect: async () => ({
            query: async () => ({ rows: [] }),
            release: () => { },
        }),
        end: async () => { },
        on: () => { },
    };
}

/**
 * Execute a query with optional user context for RLS
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @param {string} userId - User ID for row-level security context
 */
export const query = async (text, params = [], userId = null) => {
    const client = await pool.connect();

    try {
        // Set user context for row-level security if provided
        if (userId) {
            await client.query('SET LOCAL app.current_user_id = $1', [userId]);
        }

        const result = await client.query(text, params);
        return result;
    } finally {
        client.release();
    }
};

/**
 * Execute a transaction
 * @param {Function} callback - Async function receiving client
 */
export const transaction = async (callback) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Get a client from the pool for advanced use cases
 */
export const getClient = () => pool.connect();

/**
 * Close the pool gracefully
 */
export const closePool = async () => {
    await pool.end();
};

export default {
    query,
    transaction,
    getClient,
    closePool,
};
