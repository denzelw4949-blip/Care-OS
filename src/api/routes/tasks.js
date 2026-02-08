import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole, canAccessUserData } from '../middleware/rbac.js';
import TaskService from '../services/TaskService.js';

const router = express.Router();

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { assignedTo, title, description, priority, dueDate } = req.body;

        if (!assignedTo || !title) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'AssignedTo and title are required',
            });
        }

        const task = await TaskService.createTask(assignedTo, req.user.userId, {
            title,
            description,
            priority,
            dueDate,
        });

        res.status(201).json({
            success: true,
            task,
        });
    } catch (error) {
        res.status(error.message.includes('permission') ? 403 : 500).json({
            error: error.message.includes('permission') ? 'Forbidden' : 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/tasks
 * Get tasks (filtered by permissions)
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.query.userId || req.user.userId;
        const filters = {
            status: req.query.status,
            priority: req.query.priority ? parseInt(req.query.priority, 10) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        };

        const tasks = await TaskService.getUserTasks(
            userId,
            req.user.userId,
            req.user.role,
            filters
        );

        res.json({
            success: true,
            tasks,
            count: tasks.length,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/tasks/team
 * Get team tasks (manager only)
 */
router.get('/team', authenticate, requireRole(['manager', 'executive']), async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            overdue: req.query.overdue === 'true',
        };

        const tasks = await TaskService.getTeamTasks(req.user.userId, filters);

        res.json({
            success: true,
            tasks,
            count: tasks.length,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * PUT /api/tasks/:id
 * Update a task
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = {};

        const allowedUpdates = ['title', 'description', 'status', 'priority', 'dueDate'];
        for (const field of allowedUpdates) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const task = await TaskService.updateTask(
            id,
            req.user.userId,
            req.user.role,
            updates
        );

        res.json({
            success: true,
            task,
        });
    } catch (error) {
        res.status(error.message.includes('Permission') ? 403 : 500).json({
            error: error.message.includes('Permission') ? 'Forbidden' : 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * PUT /api/tasks/:id/complete
 * Mark task as complete
 */
router.put('/:id/complete', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const task = await TaskService.completeTask(id, req.user.userId);

        res.json({
            success: true,
            task,
        });
    } catch (error) {
        res.status(error.message.includes('Only') ? 403 : 500).json({
            error: error.message.includes('Only') ? 'Forbidden' : 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const task = await TaskService.deleteTask(id, req.user.userId, req.user.role);

        res.json({
            success: true,
            message: 'Task deleted',
            task,
        });
    } catch (error) {
        res.status(error.message.includes('Permission') ? 403 : 500).json({
            error: error.message.includes('Permission') ? 'Forbidden' : 'Internal Server Error',
            message: error.message,
        });
    }
});

/**
 * GET /api/tasks/:userId/statistics
 * Get task statistics
 */
router.get('/:userId/statistics', authenticate, canAccessUserData, async (req, res) => {
    try {
        const { userId } = req.params;
        const days = parseInt(req.query.days || '30', 10);

        const statistics = await TaskService.getStatistics(userId, days);

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
