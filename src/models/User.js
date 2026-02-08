import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { z } from 'zod';

// Validation schemas
const UserRoles = ['employee', 'manager', 'executive', 'consultant'];
const PlatformTypes = ['slack', 'teams'];

const UserSchema = z.object({
    id: z.string().uuid().optional(),
    platformType: z.enum(['slack', 'teams']),
    platformUserId: z.string(),
    role: z.enum(['employee', 'manager', 'executive', 'consultant']),
    email: z.string().email().optional(),
    displayName: z.string().optional(),
    managerId: z.string().uuid().optional().nullable(),
    active: z.boolean().default(true),
});

export class User {
    /**
     * Find user by platform ID
     */
    static async findByPlatformId(platformType, platformUserId) {
        const result = await db.query(
            'SELECT * FROM users WHERE platform_type = $1 AND platform_user_id = $2',
            [platformType, platformUserId]
        );
        return result.rows[0] || null;
    }

    /**
     * Find user by internal ID
     */
    static async findById(id) {
        const result = await db.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create a new user
     */
    static async create(userData) {
        const validated = UserSchema.parse(userData);
        const id = uuidv4();

        const result = await db.query(
            `INSERT INTO users (
        id, platform_type, platform_user_id, role, email, 
        display_name, manager_id, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
            [
                id,
                validated.platformType,
                validated.platformUserId,
                validated.role,
                validated.email || null,
                validated.displayName || null,
                validated.managerId || null,
                validated.active,
            ]
        );

        return result.rows[0];
    }

    /**
     * Update user
     */
    static async update(id, updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedUpdates = ['role', 'email', 'displayName', 'managerId', 'active'];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedUpdates.includes(key) && value !== undefined) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                fields.push(`${snakeKey} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(id);
        const result = await db.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );

        return result.rows[0];
    }

    /**
     * Get all direct reports for a manager
     */
    static async getDirectReports(managerId) {
        const result = await db.query(
            'SELECT * FROM users WHERE manager_id = $1 AND active = true',
            [managerId]
        );
        return result.rows;
    }

    /**
     * Get manager for a user
     */
    static async getManager(userId) {
        const result = await db.query(
            `SELECT u.* FROM users u
       INNER JOIN users e ON e.manager_id = u.id
       WHERE e.id = $1`,
            [userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Check if user has role
     */
    static async hasRole(userId, roles) {
        const result = await db.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );

        if (!result.rows[0]) return false;

        const userRole = result.rows[0].role;
        return Array.isArray(roles) ? roles.includes(userRole) : roles === userRole;
    }

    /**
     * Get user's privacy settings
     */
    static async getPrivacySettings(userId) {
        const result = await db.query(
            'SELECT * FROM privacy_settings WHERE user_id = $1',
            [userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Update user's privacy settings
     */
    static async updatePrivacySettings(userId, settings) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedSettings = [
            'checkin_visibility',
            'task_visibility',
            'recognition_visibility',
            'allow_ai_analysis',
        ];

        for (const [key, value] of Object.entries(settings)) {
            if (allowedSettings.includes(key) && value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) {
            throw new Error('No valid privacy settings to update');
        }

        values.push(userId);
        const result = await db.query(
            `UPDATE privacy_settings 
       SET ${fields.join(', ')} 
       WHERE user_id = $${paramCount} 
       RETURNING *`,
            values
        );

        return result.rows[0];
    }
}

export default User;
