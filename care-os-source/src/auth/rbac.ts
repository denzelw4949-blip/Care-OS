// src/auth/rbac.ts
import { Role } from '@prisma/client';
import { UserPayload } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('rbac');

// Permission matrix: what each role can do
export const permissions = {
    [Role.EMPLOYEE]: [
        'checkin:create:own',
        'checkin:read:own',
        'checkin:update:own',
        'task:read:own',
        'task:update:own',
        'recognition:create',
        'recognition:read:own',
        'settings:update:own',
    ],
    [Role.MANAGER]: [
        'checkin:create:own',
        'checkin:read:own',
        'checkin:read:team', // Can read team members' check-ins (if visibility allows)
        'task:create',
        'task:read:own',
        'task:read:team',
        'task:update:own',
        'task:update:team',
        'recognition:create',
        'recognition:read:own',
        'recognition:read:team',
        'deviation:read:team',
        'settings:update:own',
    ],
    [Role.EXECUTIVE]: [
        'checkin:read:all', // Can read all check-ins (if visibility allows)
        'task:create',
        'task:read:all',
        'task:update:all',
        'recognition:read:all',
        'deviation:read:all',
        'insights:read:all',
        'users:read:all',
        'users:update:all',
        'settings:update:own',
        'settings:read:all',
    ],
    [Role.CARE_CONSULTANT]: [
        'checkin:read:all', // Special access for wellbeing support
        'deviation:read:all',
        'insights:read:all',
        'users:read:all',
        'settings:read:all',
    ],
} as const;

export function hasPermission(user: UserPayload, permission: string): boolean {
    const userPermissions = permissions[user.role] || [];
    const hasAccess = userPermissions.includes(permission as any);

    if (!hasAccess) {
        logger.warn('Permission denied', {
            userId: user.id,
            role: user.role,
            permission,
        });
    }

    return hasAccess;
}

export function requirePermission(permission: string) {
    return (user: UserPayload) => {
        if (!hasPermission(user, permission)) {
            throw new Error(`Insufficient permissions: ${permission} required`);
        }
    };
}

// Check if user can access another user's data
export function canAccessUserData(
    accessor: UserPayload,
    targetUserId: string,
    managerId?: string | null
): boolean {
    // Always can access own data
    if (accessor.id === targetUserId) {
        return true;
    }

    // Executives and care consultants can access all
    if (accessor.role === Role.EXECUTIVE || accessor.role === Role.CARE_CONSULTANT) {
        return true;
    }

    // Managers can access their direct reports
    if (accessor.role === Role.MANAGER && managerId === accessor.id) {
        return true;
    }

    return false;
}
