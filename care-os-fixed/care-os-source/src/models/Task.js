import db from '../database/db.js';
import { z } from 'zod';

const TaskStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];

const TaskSchema = z.object({
    assignedTo: z.string().uuid(),
    assignedBy: z.string().uuid().optional(),
    title: z.string().min(1).max(500),
    description: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
    priority: z.number().int().min(1).max(5).default(3),
    dueDate: z.string().optional(), // ISO date string
});

export class Task {
    /**
     * Create a new task
     */
    static async create(taskData) {
        const validated = TaskSchema.parse(taskData);

        const result = await db.query(
            `INSERT INTO tasks (
        assigned_to, assigned_by, title, description,
        status, priority, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
            [
                validated.assignedTo,
                validated.assignedBy || null,
                validated.title,
                validated.description || null,
                validated.status,
                validated.priority,
                validated.dueDate || null,
            ]
        );

        return result.rows[0];
    }

    /**
     * Get task by ID
     */
    static async findById(id) {
        const result = await db.query(
            'SELECT * FROM tasks WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Get tasks for a user (with role-based filtering)
     */
    static async getByUserId(userId, requesterId, requesterRole, filters = {}) {
        let query = `
      SELECT t.*, 
             u_assigned.display_name as assigned_to_name,
             u_by.display_name as assigned_by_name
      FROM tasks t
      LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
      LEFT JOIN users u_by ON u_by.id = t.assigned_by
      WHERE 1=1
    `;

        const params = [];
        let paramCount = 1;

        // Access control
        if (userId === requesterId) {
            // User can see their own tasks
            query += ` AND t.assigned_to = $${paramCount}`;
            params.push(userId);
            paramCount++;
        } else if (requesterRole === 'manager' || requesterRole === 'executive') {
            // Managers/executives can see their team's tasks
            query += ` AND (
        t.assigned_to = $${paramCount}
        OR t.assigned_to IN (
          SELECT id FROM users WHERE manager_id = $${paramCount + 1}
        )
      )`;
            params.push(userId, requesterId);
            paramCount += 2;
        } else {
            // No access
            return [];
        }

        // Status filter
        if (filters.status) {
            query += ` AND t.status = $${paramCount}`;
            params.push(filters.status);
            paramCount++;
        }

        // Priority filter
        if (filters.priority) {
            query += ` AND t.priority = $${paramCount}`;
            params.push(filters.priority);
            paramCount++;
        }

        query += ' ORDER BY t.due_date ASC NULLS LAST, t.priority DESC, t.created_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramCount}`;
            params.push(filters.limit);
        }

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Update task
     */
    static async update(id, updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedUpdates = ['title', 'description', 'status', 'priority', 'dueDate'];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedUpdates.includes(key) && value !== undefined) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                fields.push(`${snakeKey} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        // Auto-set completed_at when status changes to completed
        if (updateData.status === 'completed') {
            fields.push(`completed_at = CURRENT_TIMESTAMP`);
        }

        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(id);
        const result = await db.query(
            `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );

        return result.rows[0];
    }

    /**
     * Mark task as complete
     */
    static async markComplete(id, userId) {
        const result = await db.query(
            `UPDATE tasks 
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND assigned_to = $2
       RETURNING *`,
            [id, userId]
        );

        return result.rows[0];
    }

    /**
     * Get team tasks for a manager
     */
    static async getTeamTasks(managerId, filters = {}) {
        let query = `
      SELECT t.*,
             u_assigned.display_name as assigned_to_name,
             u_by.display_name as assigned_by_name
      FROM tasks t
      INNER JOIN users u_assigned ON u_assigned.id = t.assigned_to
      LEFT JOIN users u_by ON u_by.id = t.assigned_by
      WHERE u_assigned.manager_id = $1
    `;

        const params = [managerId];
        let paramCount = 2;

        if (filters.status) {
            query += ` AND t.status = $${paramCount}`;
            params.push(filters.status);
            paramCount++;
        }

        if (filters.overdue) {
            query += ` AND t.due_date < CURRENT_TIMESTAMP AND t.status != 'completed'`;
        }

        query += ' ORDER BY t.due_date ASC NULLS LAST, t.priority DESC';

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get task completion statistics
     */
    static async getStatistics(userId, days = 30) {
        const result = await db.query(
            `SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (
          WHERE status != 'completed' AND due_date < CURRENT_TIMESTAMP
        ) as overdue_count
       FROM tasks
       WHERE assigned_to = $1
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'`,
            [userId]
        );

        return result.rows[0];
    }

    /**
     * Delete task
     */
    static async delete(id) {
        const result = await db.query(
            'DELETE FROM tasks WHERE id = $1 RETURNING *',
            [id]
        );
        return result.rows[0];
    }
}

export default Task;
