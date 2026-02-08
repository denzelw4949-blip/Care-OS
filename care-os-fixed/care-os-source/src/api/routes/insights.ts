// src/api/routes/insights.ts
import express from 'express';
import { authMiddleware } from '../../auth/platform-auth.js';
import { hasPermission } from '../../auth/rbac.js';
import { generateInsights } from '../../modules/insights/analyzer.js';
import { createLogger } from '../../utils/logger.js';

const router = express.Router();
const logger = createLogger('insights-api');

// Get AI-assisted insights (executives and CARE consultants only)
router.get('/', authMiddleware, async (req, res) => {
    try {
        if (!hasPermission(req.user, 'insights:read:all')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const timeRange = {
            start: req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: req.query.end ? new Date(req.query.end as string) : new Date(),
        };

        const insights = await generateInsights({
            type: 'team_wellbeing',
            timeRange,
        });

        res.json(insights);
    } catch (error) {
        logger.error('Failed to generate insights', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
