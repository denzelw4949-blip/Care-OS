import AuthService from '../services/AuthService.js';

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided',
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = AuthService.verifyToken(token);

        // Attach decoded token data to request
        req.user = {
            userId: decoded.userId,
            platformType: decoded.platformType,
            platformUserId: decoded.platformUserId,
            role: decoded.role,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: error.message,
        });
    }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = AuthService.verifyToken(token);

            req.user = {
                userId: decoded.userId,
                platformType: decoded.platformType,
                platformUserId: decoded.platformUserId,
                role: decoded.role,
            };
        }
    } catch (error) {
        // Silently fail for optional auth
        console.warn('Optional auth failed:', error.message);
    }

    next();
};

export default {
    authenticate,
    optionalAuth,
};
