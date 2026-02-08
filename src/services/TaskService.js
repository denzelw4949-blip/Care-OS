import Task from '../models/Task.js';
import User from '../models/User.js';

/**
 * Task Service
 * Handles task management with role-based access control
 */
export class TaskService {
    /**
     * Create a new task
     */
    static async createTask(assignedTo, assignedBy, taskData) {
        // Validate users exist
        const assignedToUser = await User.findById(assignedTo);
        const assignedByUser = await User.findById(assignedBy);

        if (!assignedToUser) {
            throw new Error('Assigned user not found');
        }

        if (!assignedByUser) {
            throw new Error('Assigning user not found');
        }

        // Verify assigner has permission (managers can assign to their reports)
        if (assignedByUser.role === 'employee' && assignedTo !== assignedBy) {
            throw new Error('Employees can only create tasks for themselves');
        }

        if (assignedByUser.role === 'manager') {
            const directReports = await User.getDirectReports(assignedBy);
            const canAssign = assignedTo === assignedBy ||
                directReports.some(r => r.id === assignedTo);

            if (!canAssign) {
                throw new Error('Managers can only assign tasks to themselves or their direct reports');
            }
        }

        return await Task.create({
            assignedTo,
            assignedBy,
            title: taskData.title,
            description: taskData.description,
            status: taskData.status || 'pending',
            priority: taskData.priority || 3,
            dueDate: taskData.dueDate,
        });
    }

    /**
     * Get tasks for a user
     */
    static async getUserTasks(userId, requesterId, requesterRole, filters = {}) {
        return await Task.getByUserId(userId, requesterId, requesterRole, filters);
    }

    /**
     * Get team tasks for a manager
     */
    static async getTeamTasks(managerId, filters = {}) {
        const manager = await User.findById(managerId);

        if (!manager || !['manager', 'executive'].includes(manager.role)) {
            throw new Error('User is not a manager');
        }

        return await Task.getTeamTasks(managerId, filters);
    }

    /**
     * Update task
     */
    static async updateTask(taskId, userId, userRole, updateData) {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        // Check permissions
        const canUpdate =
            task.assigned_to === userId || // Owner
            task.assigned_by === userId || // Creator
            ['executive', 'manager'].includes(userRole); // Privileged roles

        if (!canUpdate) {
            throw new Error('Permission denied');
        }

        return await Task.update(taskId, updateData);
    }

    /**
     * Mark task as complete
     */
    static async completeTask(taskId, userId) {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        if (task.assigned_to !== userId) {
            throw new Error('Only the assigned user can mark a task as complete');
        }

        return await Task.markComplete(taskId, userId);
    }

    /**
     * Delete task
     */
    static async deleteTask(taskId, userId, userRole) {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        // Only creator or executives can delete
        const canDelete =
            task.assigned_by === userId ||
            userRole === 'executive';

        if (!canDelete) {
            throw new Error('Permission denied');
        }

        return await Task.delete(taskId);
    }

    /**
     * Get task statistics
     */
    static async getStatistics(userId, days = 30) {
        return await Task.getStatistics(userId, days);
    }
}

export default TaskService;
