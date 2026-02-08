// Simplified server that runs without PostgreSQL or Redis
// Uses in-memory data storage for demo purposes

import express from 'express';
import cors from 'cors';
// import slackApp from './integrations/slack/slackApp.js'; // Converted to dynamic import below to catch init errors

const app = express();
const PORT = process.env.PORT || 3000;

// Diagnostic logging for Railway
console.log('🔍 PORT DIAGNOSTIC:');
console.log('  - process.env.PORT:', process.env.PORT);
console.log('  - Actual PORT value:', PORT);
console.log('  - PORT type:', typeof PORT);


// --- CRASH PREVENTION (Moved to Top) ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
// ------------------------

// Middleware
app.use(cors());

// Handlers moved to top

// Load Slack app dynamically (using IIFE to handle async)
let slackApp;
(async () => {
    try {
        const module = await import('./integrations/slack/slackApp.js');
        slackApp = module.default;
    } catch (err) {
        console.error('Failed to load Slack App:', err);
        // Create a dummy receiver to prevent server crash if Slack config is bad
        slackApp = {
            receiver: {
                router: (req, res, next) => next()
            }
        };
    }

    // Mount Slack webhooks AFTER loading
    app.use('/webhooks/slack', slackApp.receiver.router);

    app.use(express.json());

    // Serve static files (admin dashboard)
    app.use(express.static('.'));

    // In-memory data store
    const mockData = {
        users: [],
        checkins: [],
        tasks: [],
        recognitions: [],
        deviations: [],
        insights: []
    };

    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            message: 'CARE OS is running in demo mode',
            timestamp: new Date().toISOString(),
            mode: 'in-memory (no database required)'
        });
    });

    // Check-ins API
    app.post('/api/checkins', (req, res) => {
        const checkin = {
            id: Date.now(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        mockData.checkins.push(checkin);
        res.status(201).json({
            success: true,
            checkin,
            message: 'Check-in recorded successfully'
        });
    });

    app.get('/api/checkins', (req, res) => {
        res.json({
            success: true,
            checkins: mockData.checkins,
            count: mockData.checkins.length
        });
    });

    // Tasks API
    app.post('/api/tasks', (req, res) => {
        const task = {
            id: Date.now(),
            ...req.body,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        mockData.tasks.push(task);
        res.status(201).json({
            success: true,
            task,
            message: 'Task created successfully'
        });
    });

    app.get('/api/tasks', (req, res) => {
        res.json({
            success: true,
            tasks: mockData.tasks,
            count: mockData.tasks.length
        });
    });

    app.put('/api/tasks/:id/complete', (req, res) => {
        const task = mockData.tasks.find(t => t.id == req.params.id);
        if (task) {
            task.status = 'completed';
            task.completedAt = new Date().toISOString();
            res.json({
                success: true,
                task,
                message: 'Task completed!'
            });
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    });

    // Recognitions API
    app.post('/api/recognitions', (req, res) => {
        const recognition = {
            id: Date.now(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        mockData.recognitions.push(recognition);
        res.status(201).json({
            success: true,
            recognition,
            message: 'Recognition sent successfully!'
        });
    });

    app.get('/api/recognitions', (req, res) => {
        res.json({
            success: true,
            recognitions: mockData.recognitions,
            count: mockData.recognitions.length
        });
    });

    // Deviations API (Manager only - demo mode)
    app.get('/api/deviations', (req, res) => {
        res.json({
            success: true,
            deviations: mockData.deviations,
            count: mockData.deviations.length,
            note: 'Demo mode - showing sample deviation alerts'
        });
    });

    // AI Insights API (demo mode)
    app.post('/api/insights/team-wellbeing', (req, res) => {
        const insight = {
            id: Date.now(),
            type: 'team_wellbeing',
            content: 'Team energy levels are consistent. Consider scheduling team building activities to boost morale.',
            advisoryOnly: true,
            requiresHumanReview: true,
            createdAt: new Date().toISOString(),
            disclaimer: 'This is a demo insight. In production, this would be generated by AI with ethical guardrails.'
        };
        mockData.insights.push(insight);
        res.json({
            success: true,
            insight
        });
    });

    app.get('/api/insights', (req, res) => {
        res.json({
            success: true,
            insights: mockData.insights,
            count: mockData.insights.length
        });
    });

    // Stats endpoint
    app.get('/api/stats', (req, res) => {
        res.json({
            success: true,
            stats: {
                totalUsers: mockData.users.length,
                checkinsToday: mockData.checkins.length,
                activeTasks: mockData.tasks.filter(t => t.status === 'pending').length,
                recognitions: mockData.recognitions.length,
                deviationAlerts: mockData.deviations.length
            },
            mode: 'demo (in-memory storage)'
        });
    });

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            error: 'Not Found',
            message: `Cannot ${req.method} ${req.path}`
        });
    });

    // Error handler
    app.use((err, req, res, next) => {
        console.error('Error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    });

    // Start server - BINDING TO 0.0.0.0 FOR RAILWAY
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🏥 CARE OS - Human-Centered Wellbeing System          ║
║                                                          ║
║   ✅ SERVER SUCCESSFULLY STARTED                         ║
║   🌍 Listening on: 0.0.0.0:${PORT}                       ║
║   📊 PORT from env: ${process.env.PORT || 'NOT SET (using 3000)'}  ║
║   Mode: DEMO (In-Memory Storage)                       ║
║                                                          ║
║   Available Endpoints:                                   ║
║   • GET  /health                                         ║
║   • POST /webhooks/slack/events (Slack Events)           ║
║   • POST /webhooks/slack/interactions (Interactions)     ║
║   • POST /webhooks/slack/commands (Slash Commands)       ║
║   • POST /api/checkins                                   ║
║   • GET  /api/checkins                                   ║
║   • POST /api/tasks                                      ║
║   • GET  /api/tasks                                      ║
║   • PUT  /api/tasks/:id/complete                         ║
║   • POST /api/recognitions                               ║
║   • GET  /api/recognitions                               ║
║   • GET  /api/deviations                                 ║
║   • POST /api/insights/team-wellbeing                    ║
║   • GET  /api/insights                                   ║
║   • GET  /api/stats                                      ║
║                                                          ║
║   Admin Dashboard: /admin-dashboard.html                 ║
║                                                          ║
║   Press Ctrl+C to stop                                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
    });
})(); // Close the async IIFE

export default app;

