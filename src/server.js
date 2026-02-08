import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import db from './database/db.js';

// Import routes
import checkinsRouter from './api/routes/checkins.js';
import tasksRouter from './api/routes/tasks.js';
import recognitionsRouter from './api/routes/recognitions.js';
import deviationsRouter from './api/routes/deviations.js';
import insightsRouter from './api/routes/insights.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'CARE OS API',
    });
});

// API routes
app.use('/api/checkins', checkinsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/recognitions', recognitionsRouter);
app.use('/api/deviations', deviationsRouter);
app.use('/api/insights', insightsRouter);

// Slack webhooks (to be integrated)
app.use('/webhooks/slack', (req, res) => {
    res.json({ message: 'Slack integration coming soon' });
});

// Teams webhooks (to be integrated)
app.use('/webhooks/teams', (req, res) => {
    res.json({ message: 'Teams integration coming soon' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: config.env === 'production' ? 'An error occurred' : err.message,
        ...(config.env !== 'production' && { stack: err.stack }),
    });
});

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await db.query('SELECT NOW()');
        console.log('✓ Database connected');

        app.listen(config.port, () => {
            console.log('━'.repeat(50));
            console.log('🚀 CARE OS API Server');
            console.log('━'.repeat(50));
            console.log(`   Environment: ${config.env}`);
            console.log(`   Port: ${config.port}`);
            console.log(`   URL: http://localhost:${config.port}`);
            console.log('━'.repeat(50));
            console.log('   Ethical Guardrails: ENABLED');
            console.log('   Advisory-Only Mode: ENFORCED');
            console.log('━'.repeat(50));
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await db.closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await db.closePool();
    process.exit(0);
});

// Start if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer();
}

export default app;
