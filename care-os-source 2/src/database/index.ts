// src/database/index.ts
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('database');

const prisma = new PrismaClient({
    log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
    ],
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
        logger.debug('Query', { query: e.query, params: e.params, duration: e.duration });
    });
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
    logger.info('Database connection closed');
});

export { prisma };
