// src/auth/platform-auth.ts
import jwt from 'jsonwebtoken';
import { PlatformType, Role } from '@prisma/client';
import { prisma } from '../database/index.js';
import { config } from '../config/index.js';
import { UserPayload } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('platform-auth');

export async function authenticateUser(
    platformId: string,
    platformType: PlatformType,
    email?: string,
    displayName?: string
): Promise<UserPayload> {
    // Find or create user
    let user = await prisma.user.findUnique({
        where: {
            platformId,
        },
    });

    if (!user) {
        logger.info('Creating new user', { platformId, platformType, email });
        user = await prisma.user.create({
            data: {
                platformId,
                platformType,
                email,
                displayName,
                role: Role.EMPLOYEE, // Default role
            },
        });
    } else if (email && user.email !== email) {
        // Update email if changed
        user = await prisma.user.update({
            where: { id: user.id },
            data: { email, displayName },
        });
    }

    return {
        id: user.id,
        platformId: user.platformId,
        platformType: user.platformType,
        role: user.role,
        email: user.email || undefined,
    };
}

export function generateToken(user: UserPayload): string {
    return jwt.sign(
        {
            id: user.id,
            platformId: user.platformId,
            platformType: user.platformType,
            role: user.role,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
}

export function verifyToken(token: string): UserPayload {
    try {
        const payload = jwt.verify(token, config.jwtSecret) as UserPayload;
        return payload;
    } catch (error) {
        logger.error('Token verification failed', { error });
        throw new Error('Invalid or expired token');
    }
}

// Middleware for Express routes
export async function authMiddleware(req: any, res: any, next: any) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const user = verifyToken(token);

        // Attach user to request
        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
