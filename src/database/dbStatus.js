import config from '../config/index.js';

/**
 * Check if database is configured
 */
export const isDatabaseAvailable = () => {
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
