import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/User.js';

/**
 * Authentication Service
 * Handles user authentication, JWT generation, and platform ID mapping
 */
export class AuthService {
    /**
     * Authenticate user via platform credentials and generate JWT
     * @param {string} platformType - 'slack' or 'teams'
     * @param {string} platformUserId - Platform-specific user ID
     * @returns {Object} User data and JWT token
     */
    static async authenticateUser(platformType, platformUserId, userMetadata = {}) {
        // Find or create user
        let user = await User.findByPlatformId(platformType, platformUserId);

        if (!user) {
            // Create new user with default role
            user = await User.create({
                platformType,
                platformUserId,
                role: userMetadata.role || 'employee',
                email: userMetadata.email,
                displayName: userMetadata.displayName,
                managerId: userMetadata.managerId,
            });
        }

        // Generate JWT token
        const token = this.generateToken(user);

        return {
            user,
            token,
        };
    }

    /**
     * Generate JWT token for user
     * @param {Object} user - User object
     * @returns {string} JWT token
     */
    static generateToken(user) {
        const payload = {
            userId: user.id,
            platformType: user.platform_type,
            platformUserId: user.platform_user_id,
            role: user.role,
        };

        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn,
        });
    }

    /**
     * Verify and decode JWT token
     * @param {string} token - JWT token
     * @returns {Object} Decoded token payload
     */
    static verifyToken(token) {
        try {
            return jwt.verify(token, config.jwt.secret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            }
            throw new Error('Invalid token');
        }
    }

    /**
     * Refresh JWT token
     * @param {string} oldToken - Existing JWT token
     * @returns {string} New JWT token
     */
    static async refreshToken(oldToken) {
        const decoded = this.verifyToken(oldToken);
        const user = await User.findById(decoded.userId);

        if (!user || !user.active) {
            throw new Error('User not found or inactive');
        }

        return this.generateToken(user);
    }

    /**
     * Map platform user to internal user
     * @param {string} platformType - 'slack' or 'teams'
     * @param {string} platformUserId - Platform-specific user ID
     * @returns {Object} User object
     */
    static async getPlatformUser(platformType, platformUserId) {
        const user = await User.findByPlatformId(platformType, platformUserId);

        if (!user) {
            throw new Error('User not found');
        }

        if (!user.active) {
            throw new Error('User account is inactive');
        }

        return user;
    }
}

export default AuthService;
