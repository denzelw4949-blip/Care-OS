// src/modules/checkin/privacy.ts
import { CheckIn, User } from '@prisma/client';
import { UserPayload } from '../../types/index.js';
import { CheckInVisibility, Role } from '@prisma/client';

/**
 * Check if a user can view a specific check-in based on visibility settings
 */
export function checkDataVisibility(
    checkin: CheckIn,
    accessor: UserPayload,
    targetUser: Pick<User, 'id' | 'managerId'>
): boolean {
    // Owner can always see their own data
    if (accessor.id === checkin.userId) {
        return true;
    }

    // Executives and CARE consultants can see all (subject to visibility)
    if (accessor.role === Role.EXECUTIVE || accessor.role === Role.CARE_CONSULTANT) {
        return checkin.visibility !== CheckInVisibility.PRIVATE;
    }

    // Managers can see MANAGER and PUBLIC visibility if they're the direct manager
    if (accessor.role === Role.MANAGER && targetUser.managerId === accessor.id) {
        return checkin.visibility === CheckInVisibility.MANAGER ||
            checkin.visibility === CheckInVisibility.PUBLIC;
    }

    // Everyone can see PUBLIC
    if (checkin.visibility === CheckInVisibility.PUBLIC) {
        return true;
    }

    return false;
}
