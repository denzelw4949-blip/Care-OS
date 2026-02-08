// src/api/routes/tasks.ts
import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../auth/platform-auth.js';
import { hasPermission, canAccessUserData } from '../../auth/rbac.js';
import { prisma } from '../../database/index.js';
import { TaskStatus } from '@prisma/client';
import { createLogger } from '../../utils/logger.js';

const router = express.Router();
const logger = createLogger('tasks-api');

const createTaskSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    assignedTo: z.string().uuid(),
    dueDate: z.coerce.date().optional(),
});

const updateTaskSchema = z.object({
    status: z.nativeEnum(TaskStatus).optional(),
    completedAt: z.coerce.date().optional().nullable(),
});

// Create task (managers and executives only)
router.post('/', authMiddleware, async (req, res) => {
    try {
        if (!hasPermission(req.user, 'task:create')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const data = createTaskSchema.parse(req.body);

        const task = await prisma.task.create({
            data: {
                title: data.title,
                description: data.description,
                assignedTo: data.assignedTo,
                assignedBy: req.user.id,
                dueDate: data.dueDate,
                status: TaskStatus.PENDING,
            },
            include: {
                assignee: { select: { id: true, displayName: true, email: true } },
                creator: { select: { id: true, displayName: true, email: true } },
            },
        });

        logger.info('Task created', { taskId: task.id, assignedTo: data.assignedTo });

        res.status(201).json(task);
    } catch (error) {
        logger.error('Failed to create task', { error });
        res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid data' });
    }
});

// Get user's tasks
router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const status = req.query.status as TaskStatus | undefined;

        // Check access
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!canAccessUserData(req.user, userId, targetUser.managerId)) {
            return res.status(403).json({ error: 'Cannot access this user\'s tasks' });
        }

        const tasks = await prisma.task.findMany({
            where: {
                assignedTo: userId,
                ...(status && { status }),
            },
            orderBy: [
                { dueDate: 'asc' },
                { createdAt: 'desc' },
            ],
            include: {
                creator: { select: { id: true, displayName: true } },
            },
        });

        res.json(tasks);
    } catch (error) {
        logger.error('Failed to fetch tasks', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update task
router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const data = updateTaskSchema.parse(req.body);

        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Check if user can update this task
        const isAssignee = task.assignedTo === req.user.id;
        const hasUpdatePermission = hasPermission(req.user, 'task:update:team') ||
            hasPermission(req.user, 'task:update:all');

        if (!isAssignee && !hasUpdatePermission) {
            return res.status(403).json({ error: 'Cannot update this task' });
        }

        const updated = await prisma.task.update({
            where: { id },
            data: {
                ...(data.status && { status: data.status }),
                ...(data.status === TaskStatus.COMPLETED && !task.completedAt && {
                    completedAt: new Date(),
                }),
            },
        });

        logger.info('Task updated', { taskId: id, status: data.status });

        res.json(updated);
    } catch (error) {
        logger.error('Failed to update task', { error });
        res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid data' });
    }
});

export default router;
