import db from '../database/db.js';
import User from '../models/User.js';

/**
 * Recognition Service
 * Handles peer-to-peer recognition with privacy controls
 */
export class RecognitionService {
    /**
     * Create a new recognition
     */
    static async createRecognition(fromUserId, toUserId, message, category = null) {
        // Validate users exist
        const fromUser = await User.findById(fromUserId);
        const toUser = await User.findById(toUserId);

        if (!fromUser || !toUser) {
            throw new Error('User not found');
        }

        if (fromUserId === toUserId) {
            throw new Error('Cannot recognize yourself');
        }

        // Get recipient's privacy settings
        const privacySettings = await User.getPrivacySettings(toUserId);
        const visibility = privacySettings?.recognition_visibility || 'public';

        const result = await db.query(
            `INSERT INTO recognitions (
        from_user_id, to_user_id, message, category, visibility
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
            [fromUserId, toUserId, message, category, visibility]
        );

        return result.rows[0];
    }

    /**
     * Get recognitions for a user
     */
    static async getRecognitionsForUser(userId, requesterId, requesterRole, filters = {}) {
        let query = `
      SELECT r.*,
             u_from.display_name as from_user_name,
             u_to.display_name as to_user_name
      FROM recognitions r
      INNER JOIN users u_from ON u_from.id = r.from_user_id
      INNER JOIN users u_to ON u_to.id = r.to_user_id
      WHERE r.to_user_id = $1
    `;

        const params = [userId];
        let paramCount = 2;

        // Privacy filtering
        if (userId !== requesterId) {
            if (requesterRole === 'employee') {
                query += ` AND r.visibility = 'public'`;
            } else if (requesterRole === 'manager') {
                // Managers can see manager_only and public
                query += ` AND r.visibility IN ('manager_only', 'public')`;
            }
            // Executives and consultants can see all
        }

        if (filters.category) {
            query += ` AND r.category = $${paramCount}`;
            params.push(filters.category);
            paramCount++;
        }

        query += ' ORDER BY r.created_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramCount}`;
            params.push(filters.limit);
            paramCount++;
        }

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get recognitions given by a user
     */
    static async getRecognitionsFromUser(userId, limit = 50) {
        const result = await db.query(
            `SELECT r.*,
              u_to.display_name as to_user_name
       FROM recognitions r
       INNER JOIN users u_to ON u_to.id = r.to_user_id
       WHERE r.from_user_id = $1
       AND r.visibility = 'public'
       ORDER BY r.created_at DESC
       LIMIT $2`,
            [userId, limit]
        );

        return result.rows;
    }

    /**
     * Get team recognitions for a manager
     */
    static async getTeamRecognitions(managerId, limit = 100) {
        const result = await db.query(
            `SELECT r.*,
              u_from.display_name as from_user_name,
              u_to.display_name as to_user_name
       FROM recognitions r
       INNER JOIN users u_from ON u_from.id = r.from_user_id
       INNER JOIN users u_to ON u_to.id = r.to_user_id
       WHERE (u_from.manager_id = $1 OR u_to.manager_id = $1)
       AND r.visibility IN ('manager_only', 'public')
       ORDER BY r.created_at DESC
       LIMIT $2`,
            [managerId, limit]
        );

        return result.rows;
    }

    /**
     * Get recognition statistics
     */
    static async getStatistics(userId, days = 30) {
        const result = await db.query(
            `SELECT 
        COUNT(*) FILTER (WHERE to_user_id = $1) as received_count,
        COUNT(*) FILTER (WHERE from_user_id = $1) as given_count,
        COUNT(DISTINCT category) FILTER (WHERE to_user_id = $1) as categories_received
       FROM recognitions
       WHERE (to_user_id = $1 OR from_user_id = $1)
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'`,
            [userId]
        );

        return result.rows[0];
    }

    /**
     * Get top recognition categories for a team
     */
    static async getTopCategories(managerId, limit = 10) {
        const result = await db.query(
            `SELECT r.category, COUNT(*) as count
       FROM recognitions r
       INNER JOIN users u ON u.id = r.to_user_id
       WHERE u.manager_id = $1
       AND r.category IS NOT NULL
       AND r.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
       GROUP BY r.category
       ORDER BY count DESC
       LIMIT $2`,
            [managerId, limit]
        );

        return result.rows;
    }
}

export default RecognitionService;
