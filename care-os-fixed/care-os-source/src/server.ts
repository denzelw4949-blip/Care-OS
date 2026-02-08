// src/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { createLogger } from './utils/logger.js';
import { prisma } from './database/index.js';

// Import routes
import checkinRoutes from './api/routes/checkins.js';
import taskRoutes from './api/routes/tasks.js';
import recognitionRoutes from './api/routes/recognition.js';
import userRoutes from './api/routes/users.js';
import insightsRoutes from './api/routes/insights.js';

const logger = createLogger('server');
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: config.nodeEnv === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
    credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (error) {
        logger.error('Health check failed', { error });
        res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
    }
});

// API Routes
app.use('/api/checkins', checkinRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/recognition', recognitionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/insights', insightsRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', { error: err, path: req.path });
    res.status(500).json({
        error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    });
});

// Start server
const PORT = config.port;
app.listen(PORT, async () => {
    logger.info(`CARE OS server running on port ${PORT}`, {
        nodeEnv: config.nodeEnv,
        guardrails: config.enableGuardrails,
    });

    // Initialize Slack integration if configured
    if (config.slack.botToken && config.slack.signingSecret) {
        try {
            const { startSlackApp } = await import('./integrations/slack/index.js');
            await startSlackApp();
            logger.info('Slack integration started');
        } catch (error) {
            logger.error('Failed to start Slack integration', { error });
        }
    }

    // Start schedulers
    const { startCheckinScheduler, startDeviationScheduler } = await import('./modules/checkin/scheduler.js');
    startCheckinScheduler();
    startDeviationScheduler();
    logger.info('Schedulers started');
});

export { app };
