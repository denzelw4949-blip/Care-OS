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
            try {
                // Try to get tasks from database
                const { user } = await AuthService.authenticateUser('slack', slackUserId);
                tasks = await TaskService.getUserTasks(user.id, user.id, user.role, {
                    status: 'pending',
                    limit: 10,
                });
                console.log('✅ Tasks fetched from database');
            } catch (dbError) {
                console.warn('⚠️  Database query failed:', dbError.message);
                tasks = []; // Empty - no demo tasks
            }
        } else {
            // Demo mode - no tasks available yet
            tasks = [];
        }

        const blocks = tasks.length > 0
            ? getTaskListBlocks(tasks)
            : [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '📋 *Your Tasks*'
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: 'You have no pending tasks right now! 🎉\n\n_Tasks can be assigned by managers or created through your dashboard._'
                    }
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: '💡 Tasks will appear here when you have work assigned'
                        }
                    ]
                }
            ];

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
            try {
                const { user } = await AuthService.authenticateUser('slack', slackUserId);
                await TaskService.completeTask(taskId, user.id);
                console.log('✅ Task completion saved to database');
            } catch (dbError) {
                console.warn('⚠️  Database update failed, logging only:', dbError.message);
                console.log('✏️ Task completed (fallback demo mode):', {
                    user: slackUserId,
                    taskId,
                    timestamp: new Date().toISOString()
                });
            }
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
