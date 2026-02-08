// src/api/routes/checkins.ts
import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../auth/platform-auth.js';
import { hasPermission, canAccessUserData } from '../../auth/rbac.js';
import { prisma } from '../../database/index.js';
import { CheckInVisibility } from '@prisma/client';
import { createLogger } from '../../utils/logger.js';
import { checkDataVisibility } from '../../modules/checkin/privacy.js';

const router = express.Router();
const logger = createLogger('checkins-api');

// Validation schemas
const createCheckinSchema = z.object({
    moodScore: z.number().min(1).max(10),
    workloadLevel: z.number().min(1).max(10),
    notes: z.string().optional(),
    visibility: z.nativeEnum(CheckInVisibility).default(CheckInVisibility.MANAGER),
});

const updateVisibilitySchema = z.object({
    visibility: z.nativeEnum(CheckInVisibility),
});

// Create check-in
router.post('/', authMiddleware, async (req, res) => {
    try {
        if (!hasPermission(req.user, 'checkin:create:own')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const data = createCheckinSchema.parse(req.body);

        const checkin = await prisma.checkIn.create({
            data: {
                userId: req.user.id,
                moodScore: data.moodScore,
                workloadLevel: data.workloadLevel,
                notes: data.notes,
                visibility: data.visibility,
            },
        });

        logger.info('Check-in created', { userId: req.user.id, checkinId: checkin.id });

        res.status(201).json(checkin);
    } catch (error) {
        logger.error('Failed to create check-in', { error });
        res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid data' });
    }
});

// Get check-in history
router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit as string) || 30;
        const offset = parseInt(req.query.offset as string) || 0;

        // Check if user can access this data
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!canAccessUserData(req.user, userId, targetUser.managerId)) {
            return res.status(403).json({ error: 'Cannot access this user\'s data' });
        }

        // Fetch check-ins
        const checkins = await prisma.checkIn.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: limit,
            skip: offset,
        });

        // Filter based on visibility permissions
        const filteredCheckins = checkins.filter(checkin =>
            checkDataVisibility(checkin, req.user, targetUser)
        );

        res.json(filteredCheckins);
    } catch (error) {
        logger.error('Failed to fetch check-ins', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update check-in visibility
router.patch('/:id/visibility', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const data = updateVisibilitySchema.parse(req.body);

        const checkin = await prisma.checkIn.findUnique({ where: { id } });
        if (!checkin) {
            return res.status(404).json({ error: 'Check-in not found' });
        }

        // Only owner can update visibility
        if (checkin.userId !== req.user.id) {
            return res.status(403).json({ error: 'Can only update own check-ins' });
        }

        const updated = await prisma.checkIn.update({
            where: { id },
            data: { visibility: data.visibility },
        });

        logger.info('Check-in visibility updated', { checkinId: id, newVisibility: data.visibility });

        res.json(updated);
    } catch (error) {
        logger.error('Failed to update visibility', { error });
        res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid data' });
    }
});

export default router;
