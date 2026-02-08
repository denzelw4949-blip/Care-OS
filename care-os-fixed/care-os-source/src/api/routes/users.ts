// src/api/routes/users.ts
import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../auth/platform-auth.js';
import { hasPermission } from '../../auth/rbac.js';
import { prisma } from '../../database/index.js';
import { createLogger } from '../../utils/logger.js';

const router = express.Router();
const logger = createLogger('users-api');

const updatePermissionsSchema = z.object({
    dataType: z.string(),
    visibleTo: z.array(z.string()),
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                manager: { select: { id: true, displayName: true, email: true } },
                dataPermissions: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        logger.error('Failed to fetch user profile', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update data visibility settings
router.patch('/me/permissions', authMiddleware, async (req, res) => {
    try {
        const data = updatePermissionsSchema.parse(req.body);

        const permission = await prisma.dataPermission.upsert({
            where: {
                userId_dataType: {
                    userId: req.user.id,
                    dataType: data.dataType,
                },
            },
            create: {
                userId: req.user.id,
                dataType: data.dataType,
                visibleTo: data.visibleTo,
            },
            update: {
                visibleTo: data.visibleTo,
            },
        });

        logger.info('Data permissions updated', {
            userId: req.user.id,
            dataType: data.dataType,
        });

        res.json(permission);
    } catch (error) {
        logger.error('Failed to update permissions', { error });
        res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid data' });
    }
});

export default router;
