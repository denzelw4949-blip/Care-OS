// src/api/routes/recognition.ts
import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../auth/platform-auth.js';
import { hasPermission } from '../../auth/rbac.js';
import { prisma } from '../../database/index.js';
import { createLogger } from '../../utils/logger.js';

const router = express.Router();
const logger = createLogger('recognition-api');

const createRecognitionSchema = z.object({
    toUserId: z.string().uuid(),
    message: z.string().min(1).max(1000),
    isPublic: z.boolean().default(true),
});

// Send recognition
router.post('/', authMiddleware, async (req, res) => {
    try {
        if (!hasPermission(req.user, 'recognition:create')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const data = createRecognitionSchema.parse(req.body);

        // Check if recipient exists
        const recipient = await prisma.user.findUnique({ where: { id: data.toUserId } });
        if (!recipient) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        const recognition = await prisma.recognition.create({
            data: {
                fromUserId: req.user.id,
                toUserId: data.toUserId,
                message: data.message,
                isPublic: data.isPublic,
            },
            include: {
                sender: { select: { id: true, displayName: true } },
                recipient: { select: { id: true, displayName: true } },
            },
        });

        logger.info('Recognition sent', {
            fromUserId: req.user.id,
            toUserId: data.toUserId,
            isPublic: data.isPublic,
        });

        res.status(201).json(recognition);
    } catch (error) {
        logger.error('Failed to send recognition', { error });
        res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid data' });
    }
});

// Get recognition history
router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

        const recognitions = await prisma.recognition.findMany({
            where: {
                OR: [
                    { toUserId: userId },
                    { fromUserId: userId },
                ],
            },
            orderBy: { timestamp: 'desc' },
            take: limit,
            include: {
                sender: { select: { id: true, displayName: true } },
                recipient: { select: { id: true, displayName: true } },
            },
        });

        // Filter: only show public recognitions or those involving the current user
        const filtered = recognitions.filter(r =>
            r.isPublic || r.fromUserId === req.user.id || r.toUserId === req.user.id
        );

        res.json(filtered);
    } catch (error) {
        logger.error('Failed to fetch recognitions', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
