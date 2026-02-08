import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole, canAccessUserData } from '../middleware/rbac.js';
import CheckInService from '../services/CheckInService.js';

const router = express.Router();

/**
 * POST /api/checkins
 * Submit a daily check-in
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { energyLevel, stressLevel, workloadLevel, mood, notes, visibility } = req.body;

        if (!energyLevel || !stressLevel || !workloadLevel) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Energy, stress, and workload levels are required',
            });
        }

        const checkIn = await CheckInService.submitCheckIn(req.user.userId, {
            energyLevel,
            stressLevel,
            workloadLevel,
            mood,
            notes,
            visibility,
        });

        res.status(201).json({
            success: true,
            checkIn,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/checkins/:userId
 * Get check-ins for a user (privacy-aware)
 */
router.get('/:userId', authenticate, canAccessUserData, async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit || '30', 10);

        const checkIns = await CheckInService.getUserCheckIns(
            userId,
            req.user.userId,
            req.user.role,
            limit
        );

        res.json({
            success: true,
            checkIns,
            count: checkIns.length,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/checkins/team/today
 * Get today's team check-ins (manager only)
 */
router.get('/team/today', authenticate, requireRole(['manager', 'executive']), async (req, res) => {
    try {
        const checkIns = await CheckInService.getTeamCheckIns(req.user.userId);

        res.json({
            success: true,
            checkIns,
            count: checkIns.length,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * PUT /api/checkins/:id/privacy
 * Update check-in privacy setting
 */
router.put('/:id/privacy', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { visibility } = req.body;

        if (!['private', 'manager_only', 'public'].includes(visibility)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid visibility level',
            });
        }

        const checkIn = await CheckInService.updateCheckInPrivacy(
            id,
            req.user.userId,
            visibility
        );

        res.json({
            success: true,
            checkIn,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/checkins/:userId/statistics
 * Get check-in statistics
 */
router.get('/:userId/statistics', authenticate, canAccessUserData, async (req, res) => {
    try {
        const { userId } = req.params;
        const days = parseInt(req.query.days || '30', 10);

        const statistics = await CheckInService.getStatistics(userId, days);

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
