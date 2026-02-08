import db from '../database/db.js';
import User from '../models/User.js';

/**
 * Deviation Detection Service
 * Monitors check-in data and triggers alerts for managers
 * ETHICAL CONSTRAINT: Advisory only, no disciplinary recommendations
 */
export class DeviationDetectionService {
    /**
     * Create a deviation alert for a manager
     */
    static async createDeviationAlert(userId, deviations) {
        // Get user's manager
        const user = await User.findById(userId);
        if (!user || !user.manager_id) {
            // No manager to alert
            return null;
        }

        // Get user's privacy settings
        const privacySettings = await User.getPrivacySettings(userId);
        if (!privacySettings?.allow_ai_analysis) {
            // User has opted out of AI analysis
            return null;
        }

        // Determine severity based on number and magnitude of deviations
        let severity = 'low';
        if (deviations.length >= 2) severity = 'medium';
        if (deviations.length >= 3) severity = 'high';

        // Create description (advisory only, no disciplinary language)
        const description = `Check-in pattern shift detected for ${user.display_name || 'team member'}. ` +
            `Consider having a supportive conversation. ` +
            deviations.map(d => `${d.metric}: ${d.previous} → ${d.current}`).join(', ');

        const result = await db.query(
            `INSERT INTO deviation_alerts (
        user_id, manager_id, alert_type, severity, description, data_summary
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
            [
                userId,
                user.manager_id,
                'checkin_deviation',
                severity,
                description,
                JSON.stringify({ deviations }),
            ]
        );

        return result.rows[0];
    }

    /**
     * Get deviation alerts for a manager
     */
    static async getAlertsForManager(managerId, filters = {}) {
        let query = `
      SELECT da.*, u.display_name as user_name, u.email as user_email
      FROM deviation_alerts da
      INNER JOIN users u ON u.id = da.user_id
      WHERE da.manager_id = $1
    `;

        const params = [managerId];
        let paramCount = 2;

        if (filters.acknowledged !== undefined) {
            query += ` AND da.acknowledged = $${paramCount}`;
            params.push(filters.acknowledged);
            paramCount++;
        }

        if (filters.severity) {
            query += ` AND da.severity = $${paramCount}`;
            params.push(filters.severity);
            paramCount++;
        }

        query += ' ORDER BY da.created_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramCount}`;
            params.push(filters.limit);
        }

        const result = await db.query(query, params);

        // Add advisory flag to all results
        return result.rows.map(alert => ({
            ...alert,
            advisoryOnly: true,
            requiresHumanReview: true,
            disclaimer: 'This alert is for awareness only. Please use your judgment for appropriate supportive action.',
        }));
    }

    /**
     * Acknowledge a deviation alert
     */
    static async acknowledgeAlert(alertId, managerId, notes = null) {
        const result = await db.query(
            `UPDATE deviation_alerts
       SET acknowledged = true,
           acknowledged_at = CURRENT_TIMESTAMP,
           acknowledged_by = $2
       WHERE id = $1 AND manager_id = $2
       RETURNING *`,
            [alertId, managerId]
        );

        if (result.rows.length === 0) {
            throw new Error('Alert not found or access denied');
        }

        // Log the acknowledgment (optional notes for tracking)
        if (notes) {
            await db.query(
                `UPDATE deviation_alerts
         SET data_summary = jsonb_set(
           COALESCE(data_summary, '{}'::jsonb),
           '{acknowledgment_notes}',
           $2::jsonb
         )
         WHERE id = $1`,
                [alertId, JSON.stringify(notes)]
            );
        }

        return result.rows[0];
    }

    /**
     * Get alert statistics for a manager
     */
    static async getAlertStatistics(managerId) {
        const result = await db.query(
            `SELECT 
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE acknowledged = false) as unacknowledged,
        COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium_severity,
        COUNT(*) FILTER (WHERE severity = 'low') as low_severity
       FROM deviation_alerts
       WHERE manager_id = $1
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'`,
            [managerId]
        );

        return {
            ...result.rows[0],
            advisoryOnly: true,
            disclaimer: 'Statistics for awareness only.',
        };
    }
}

export default DeviationDetectionService;
