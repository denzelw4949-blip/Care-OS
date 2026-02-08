// Demo mode task handler - no database required
import { getTaskListBlocks } from '../blocks/checkInBlock.js';

/**
 * Handle task interactions
 */
export const handleTaskInteraction = async (slackUserId, client, triggerId = null) => {
    try {
        // Demo mode - show sample tasks
        const demoTasks = [
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

        const blocks = getTaskListBlocks(demoTasks);

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
        // Demo mode - just log and confirm
        console.log('Task completed:', {
            user: slackUserId,
            taskId,
            timestamp: new Date().toISOString()
        });

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
