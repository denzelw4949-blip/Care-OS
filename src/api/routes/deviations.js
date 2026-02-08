import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateAIResponse, logAIInteraction } from '../middleware/ethicalGuardrails.js';
import DeviationDetectionService from '../services/DeviationDetectionService.js';

const router = express.Router();

// Apply ethical guardrails to all routes
router.use(validateAIResponse);
router.use(logAIInteraction);

/**
 * GET /api/deviations
 * Get deviation alerts for a manager
 */
router.get('/', authenticate, requireRole(['manager', 'executive']), async (req, res) => {
    try {
        const filters = {
            acknowledged: req.query.acknowledged === 'true' ? true :
                req.query.acknowledged === 'false' ? false : undefined,
            severity: req.query.severity,
            limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
        };

        const alerts = await DeviationDetectionService.getAlertsForManager(
            req.user.userId,
            filters
        );

        res.json({
            success: true,
            alerts,
            count: alerts.length,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * POST /api/deviations/:id/acknowledge
 * Acknowledge a deviation alert
 */
router.post('/:id/acknowledge', authenticate, requireRole(['manager', 'executive']), async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const alert = await DeviationDetectionService.acknowledgeAlert(
            id,
            req.user.userId,
            notes
        );

        res.json({
            success: true,
            alert,
            message: 'Alert acknowledged',
        });
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 500).json({
            error: error.message.includes('not found') ? 'Not Found' : 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/deviations/statistics
 * Get alert statistics for a manager
 */
router.get('/statistics', authenticate, requireRole(['manager', 'executive']), async (req, res) => {
    try {
        const statistics = await DeviationDetectionService.getAlertStatistics(req.user.userId);

        res.json({
            success: true,
            statistics,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

export default router;
