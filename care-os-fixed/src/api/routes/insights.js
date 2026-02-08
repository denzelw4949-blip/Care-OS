import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateAIResponse, enforceAdvisoryOnly, logAIInteraction } from '../middleware/ethicalGuardrails.js';
import AIInsightsService from '../services/AIInsightsService.js';

const router = express.Router();

// Apply ethical guardrails to all routes
router.use(validateAIResponse);
router.use(enforceAdvisoryOnly);
router.use(logAIInteraction);

/**
 * POST /api/insights/team-wellbeing
 * Generate team wellbeing insights (manager only)
 */
router.post('/team-wellbeing', authenticate, requireRole(['manager', 'executive']), async (req, res) => {
    try {
        const insight = await AIInsightsService.generateTeamWellbeingInsights(req.user.userId);

        res.json({
            success: true,
            insight,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * POST /api/insights/individual-support
 * Generate individual support suggestions (manager only)
 */
router.post('/individual-support', authenticate, requireRole(['manager', 'executive', 'consultant']), async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'userId is required',
            });
        }

        const insight = await AIInsightsService.generateIndividualSupportSuggestions(
            userId,
            req.user.userId
        );

        res.json({
            success: true,
            insight,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/insights
 * Get insights for the user's role
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;

        const insights = await AIInsightsService.getInsightsForRole(req.user.role, limit);

        res.json({
            success: true,
            insights,
            count: insights.length,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * POST /api/insights/:id/review
 * Mark insight as reviewed by human
 */
router.post('/:id/review', authenticate, requireRole(['manager', 'executive', 'consultant']), async (req, res) => {
    try {
        const { id } = req.params;
        const { actionTaken } = req.body;

        const insight = await AIInsightsService.markAsReviewed(
            id,
            req.user.userId,
            actionTaken
        );

        res.json({
            success: true,
            insight,
            message: 'Insight marked as reviewed',
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

export default router;
