import AuthService from '../../../services/AuthService.js';
import TaskService from '../../../services/TaskService.js';
import { getTaskListBlocks } from '../blocks/checkInBlock.js';

/**
 * Handle task interactions
 */
export const handleTaskInteraction = async (slackUserId, client, triggerId = null) => {
    try {
        // Authenticate user
        const { user } = await AuthService.authenticateUser('slack', slackUserId);

        // Get user's tasks
        const tasks = await TaskService.getUserTasks(user.id, user.id, user.role, {
            status: 'pending',
            limit: 10,
        });

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
        const { user } = await AuthService.authenticateUser('slack', slackUserId);

        await TaskService.completeTask(taskId, user.id);

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
