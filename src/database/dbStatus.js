import config from '../config/index.js';

/**
 * Check if database is configured
 * Railway provides DATABASE_URL, not individual fields
 */
export const isDatabaseAvailable = () => {
    // Check for DATABASE_URL (Railway/production) first
    if (process.env.DATABASE_URL) {
        return true;
    }

    // Fall back to checking individual config fields (local dev)
    return Boolean(
        config.database.host &&
        config.database.user &&
        config.database.host !== 'localhost'
    );
};

/**
 * Export database status for other modules to check
 */
export const DB_MODE = isDatabaseAvailable() ? 'production' : 'demo';

console.log(`📊 Database Mode: ${DB_MODE.toUpperCase()}`);
if (process.env.DATABASE_URL) {
    console.log(`✅ DATABASE_URL detected - Production mode enabled`);
}
