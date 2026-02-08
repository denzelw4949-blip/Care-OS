import db from '../database/db.js';
import { z } from 'zod';

const PrivacyLevels = ['private', 'manager_only', 'public'];

const CheckInSchema = z.object({
    userId: z.string().uuid(),
    energyLevel: z.number().int().min(1).max(10),
    stressLevel: z.number().int().min(1).max(10),
    workloadLevel: z.number().int().min(1).max(10),
    mood: z.string().optional(),
    notes: z.string().optional(),
    visibility: z.enum(['private', 'manager_only', 'public']).default('manager_only'),
    checkInDate: z.string().optional(), // ISO date string
});

export class CheckIn {
    /**
     * Create a new check-in
     */
    static async create(checkInData) {
        const validated = CheckInSchema.parse(checkInData);

        const result = await db.query(
            `INSERT INTO human_state_checkins (
        user_id, energy_level, stress_level, workload_level,
        mood, notes, visibility, check_in_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, check_in_date) 
      DO UPDATE SET
        energy_level = EXCLUDED.energy_level,
        stress_level = EXCLUDED.stress_level,
        workload_level = EXCLUDED.workload_level,
        mood = EXCLUDED.mood,
        notes = EXCLUDED.notes,
        visibility = EXCLUDED.visibility
      RETURNING *`,
            [
                validated.userId,
                validated.energyLevel,
                validated.stressLevel,
                validated.workloadLevel,
                validated.mood || null,
                validated.notes || null,
                validated.visibility,
                validated.checkInDate || new Date().toISOString().split('T')[0],
            ]
        );

        return result.rows[0];
    }

    /**
     * Get check-ins for a user (respecting privacy settings)
     */
    static async getByUserId(userId, requesterId, requesterRole, limit = 30) {
        // Determine what the requester can see
        let query;
        let params;

        if (userId === requesterId) {
            // User can see all their own check-ins
            query = `
        SELECT * FROM human_state_checkins
        WHERE user_id = $1
        ORDER BY check_in_date DESC
        LIMIT $2
      `;
            params = [userId, limit];
        } else if (requesterRole === 'manager' || requesterRole === 'executive') {
            // Managers/executives can see check-ins visible to them
            query = `
        SELECT hsc.* FROM human_state_checkins hsc
        INNER JOIN users u ON u.id = hsc.user_id
        WHERE hsc.user_id = $1
        AND (
          hsc.visibility IN ('manager_only', 'public')
          AND (u.manager_id = $2 OR $3 = 'executive')
        )
        ORDER BY hsc.check_in_date DESC
        LIMIT $4
      `;
            params = [userId, requesterId, requesterRole, limit];
        } else {
            // Other roles can only see public check-ins
            query = `
        SELECT * FROM human_state_checkins
        WHERE user_id = $1 AND visibility = 'public'
        ORDER BY check_in_date DESC
        LIMIT $2
      `;
            params = [userId, limit];
        }

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get recent check-ins for deviation detection
     */
    static async getRecentForAnalysis(userId, days = 7) {
        const result = await db.query(
            `SELECT * FROM human_state_checkins
       WHERE user_id = $1
       AND check_in_date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY check_in_date ASC`,
            [userId]
        );
        return result.rows;
    }

    /**
     * Get team check-ins for a manager
     */
    static async getTeamCheckIns(managerId, date = null) {
        const dateFilter = date
            ? 'AND hsc.check_in_date = $2'
            : 'AND hsc.check_in_date = CURRENT_DATE';

        const params = date ? [managerId, date] : [managerId];

        const result = await db.query(
            `SELECT hsc.*, u.display_name, u.email
       FROM human_state_checkins hsc
       INNER JOIN users u ON u.id = hsc.user_id
       WHERE u.manager_id = $1
       AND hsc.visibility IN ('manager_only', 'public')
       ${dateFilter}
       ORDER BY hsc.created_at DESC`,
            params
        );

        return result.rows;
    }

    /**
     * Update check-in privacy setting
     */
    static async updatePrivacy(checkInId, userId, visibility) {
        if (!PrivacyLevels.includes(visibility)) {
            throw new Error(`Invalid visibility level: ${visibility}`);
        }

        const result = await db.query(
            `UPDATE human_state_checkins
       SET visibility = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
            [visibility, checkInId, userId]
        );

        return result.rows[0];
    }

    /**
     * Calculate check-in statistics for a user
     */
    static async getStatistics(userId, days = 30) {
        const result = await db.query(
            `SELECT 
        AVG(energy_level) as avg_energy,
        AVG(stress_level) as avg_stress,
        AVG(workload_level) as avg_workload,
        COUNT(*) as total_checkins
       FROM human_state_checkins
       WHERE user_id = $1
       AND check_in_date >= CURRENT_DATE - INTERVAL '${days} days'`,
            [userId]
        );

        return result.rows[0];
    }

    /**
     * Delete old check-ins (data retention policy)
     */
    static async deleteOlderThan(days = 365) {
        const result = await db.query(
            `DELETE FROM human_state_checkins
       WHERE check_in_date < CURRENT_DATE - INTERVAL '${days} days'`
        );

        return result.rowCount;
    }
}

export default CheckIn;
