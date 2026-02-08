import User from '../models/User.js';

/**
 * Role-based access control middleware
 */

/**
 * Require specific roles to access endpoint
 * @param {Array<string>} allowedRoles - Array of allowed roles
 */
export const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }

            // Check if user's role is in allowed roles
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                error: 'Internal Server Error',
                message: error.message,
            });
        }
    };
};

/**
 * Check if user can access another user's data
 * Employees can only access their own data
 * Managers can access their direct reports' data
 * Executives and consultants can access all data
 */
export const canAccessUserData = async (req, res, next) => {
    try {
        const requesterId = req.user.userId;
        const requesterRole = req.user.role;
        const targetUserId = req.params.userId || req.body.userId;

        // User accessing their own data
        if (requesterId === targetUserId) {
            req.accessLevel = 'self';
            return next();
        }

        // Executives and consultants have full access
        if (requesterRole === 'executive' || requesterRole === 'consultant') {
            req.accessLevel = 'full';
            return next();
        }

        // Managers can access their direct reports
        if (requesterRole === 'manager') {
            const targetUser = await User.findById(targetUserId);

            if (targetUser && targetUser.manager_id === requesterId) {
                req.accessLevel = 'team';
                return next();
            }
        }

        // No access
        return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have permission to access this data',
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
};

/**
 * Enforce privacy settings for data access
 */
export const enforcePrivacy = async (req, res, next) => {
    try {
        const requesterId = req.user.userId;
        const targetUserId = req.params.userId || req.body.userId;

        // Get target user's privacy settings
        const privacySettings = await User.getPrivacySettings(targetUserId);

        if (!privacySettings) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Privacy settings not found',
            });
        }

        // Attach privacy settings to request for downstream use
        req.privacySettings = privacySettings;
        req.targetUserId = targetUserId;

        next();
    } catch (error) {
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
        });
    }
};

/**
 * Manager-only access
 */
export const requireManager = requireRole(['manager', 'executive']);

/**
 * Executive/Admin access
 */
export const requireExecutive = requireRole(['executive']);

/**
 * Consultant access
 */
export const requireConsultant = requireRole(['consultant', 'executive']);

export default {
    requireRole,
    canAccessUserData,
    enforcePrivacy,
    requireManager,
    requireExecutive,
    requireConsultant,
};
