import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import RecognitionService from '../services/RecognitionService.js';

const router = express.Router();

/**
 * POST /api/recognitions
 * Send a recognition
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { toUserId, message, category } = req.body;

        if (!toUserId || !message) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'toUserId and message are required',
            });
        }

        const recognition = await RecognitionService.createRecognition(
            req.user.userId,
            toUserId,
            message,
            category
        );

        res.status(201).json({
            success: true,
            recognition,
        });
    } catch (error) {
        res.status(error.message.includes('Cannot') ? 400 : 500).json({
            error: error.message.includes('Cannot') ? 'Bad Request' : 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/recognitions
 * Get recognitions for a user
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.query.userId || req.user.userId;
        const filters = {
            category: req.query.category,
            limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
        };

        const recognitions = await RecognitionService.getRecognitionsForUser(
            userId,
            req.user.userId,
            req.user.role,
            filters
        );

        res.json({
            success: true,
            recognitions,
            count: recognitions.length,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/recognitions/given
 * Get recognitions given by the authenticated user
 */
router.get('/given', authenticate, async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;

        const recognitions = await RecognitionService.getRecognitionsFromUser(
            req.user.userId,
            limit
        );

        res.json({
            success: true,
            recognitions,
            count: recognitions.length,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/recognitions/team
 * Get team recognitions (manager only)
 */
router.get('/team', authenticate, requireRole(['manager', 'executive']), async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;

        const recognitions = await RecognitionService.getTeamRecognitions(
            req.user.userId,
            limit
        );

        res.json({
            success: true,
            recognitions,
            count: recognitions.length,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/recognitions/:userId/statistics
 * Get recognition statistics
 */
router.get('/:userId/statistics', authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        const days = parseInt(req.query.days || '30', 10);

        // Only allow viewing own stats or if manager/executive
        if (userId !== req.user.userId && !['manager', 'executive'].includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied',
            });
        }

        const statistics = await RecognitionService.getStatistics(userId, days);

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

/**
 * GET /api/recognitions/team/categories
 * Get top recognition categories for team (manager only)
 */
router.get('/team/categories', authenticate, requireRole(['manager', 'executive']), async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;

        const categories = await RecognitionService.getTopCategories(req.user.userId, limit);

        res.json({
            success: true,
            categories,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

export default router;
