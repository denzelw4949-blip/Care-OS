import AuthService from '../../../services/AuthService.js';
import TaskService from '../../../services/TaskService.js';
import { getTaskListBlocks } from '../blocks/checkInBlock.js';
import { isDatabaseAvailable } from '../../../database/dbStatus.js';

/**
 * Handle task interactions
 */
export const handleTaskInteraction = async (slackUserId, client, triggerId = null) => {
    try {
        const hasDatabase = isDatabaseAvailable();
        let tasks = [];

        if (hasDatabase) {
            // Get tasks from database
            const { user } = await AuthService.authenticateUser('slack', slackUserId);
            tasks = await TaskService.getUserTasks(user.id, user.id, user.role, {
                status: 'pending',
                limit: 10,
            });
        } else {
            // Demo mode - show sample tasks
            tasks = [
                {
                    id: '1',
                    title: 'Complete daily check-in',
                    description: 'Share how you\'re feeling today',
                    status: 'pending',
                    priority: 'medium'
                },
                {
                    id: '2',
                    title: 'Review team recognitions',
                    description: 'Acknowledge great work from teammates',
                    status: 'pending',
                    priority: 'low'
                }
            ];
        }

        const blocks = getTaskListBlocks(tasks);

        if (triggerId) {
            // Show in modal
            await client.views.open({
                trigger_id: triggerId,
                view: {
                    type: 'modal',
                    title: {
                        type: 'plain_text',
                        text: 'Your Tasks',
                    },
                    blocks,
                },
            });
        } else {
            // Send as message
            await client.chat.postMessage({
                channel: slackUserId,
                blocks,
            });
        }
    } catch (error) {
        console.error('Error in task interaction:', error);

        if (client && slackUserId) {
            await client.chat.postMessage({
                channel: slackUserId,
                text: '❌ Sorry, there was an error fetching your tasks. Please try again.',
            });
        }
    }
};

/**
 * Handle task completion
 */
export const handleTaskCompletion = async (slackUserId, taskId, client) => {
    try {
        const hasDatabase = isDatabaseAvailable();

        if (hasDatabase) {
            const { user } = await AuthService.authenticateUser('slack', slackUserId);
            await TaskService.completeTask(taskId, user.id);
        } else {
            console.log('✏️ Task completed (demo mode):', {
                user: slackUserId,
                taskId,
                timestamp: new Date().toISOString()
            });
        }

        await client.chat.postMessage({
            channel: slackUserId,
            text: '✅ Task completed! Great work! 🎉',
        });
    } catch (error) {
        console.error('Error completing task:', error);

        await client.chat.postMessage({
            channel: slackUserId,
            text: '❌ Sorry, there was an error completing the task.',
        });
    }
};

export default handleTaskInteraction;
