import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

// Check if DB config is present
// Railway provides DATABASE_URL, local dev uses individual fields
// Check if DB config is present
// Railway provides DATABASE_URL, local dev uses individual fields
const hasDbConfig = Boolean(
    process.env.DATABASE_URL ||
    process.env.PGHOST ||
    (config.database.host && config.database.user && config.database.host !== 'localhost')
);

let pool;

if (hasDbConfig) {
    // Create database connection pool
    // Create database connection pool
    // Prioritize DATABASE_URL, then explicit config, then standard PG env vars
    const poolConfig = {};

    if (process.env.DATABASE_URL) {
        poolConfig.connectionString = process.env.DATABASE_URL;
        poolConfig.ssl = { rejectUnauthorized: false };
    } else {
        poolConfig.host = config.database.host;
        poolConfig.port = config.database.port;
        poolConfig.database = config.database.name;
        poolConfig.user = config.database.user;
        poolConfig.password = config.database.password;
        // Standard PG env vars will be used by pg.Pool if these are undefined
    }

    // Explicitly add SSL for Railway if not using DATABASE_URL but host is not local
    if (!poolConfig.connectionString && config.database.host && config.database.host !== 'localhost' && config.database.host !== '127.0.0.1') {
        poolConfig.ssl = { rejectUnauthorized: false };
    }

    // Common pool settings
    poolConfig.max = 20;
    poolConfig.idleTimeoutMillis = 30000;
    poolConfig.connectionTimeoutMillis = 2000;

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
