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


        const blocks = getTaskListBlocks(tasks);

        // Always send as message (buttons in modals don't trigger action handlers properly)
        await client.chat.postMessage({
            channel: slackUserId,
            blocks,
            text: '📋 Your Tasks', // Fallback text
        });
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
/**
 * Handle task completion button click - asks who to notify
 */
export const handleTaskCompletion = async (action, client, userId) => {
    try {
        const taskId = action.value;

        // Open "Who should I notify?" modal
        await client.views.open({
            trigger_id: action.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'notify_completion_modal',
                title: {
                    type: 'plain_text',
                    text: '✅ Task Complete!',
                },
                submit: {
                    type: 'plain_text',
                    text: 'Complete & Notify',
                },
                private_metadata: JSON.stringify({ taskId }),
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '🎉 Great work! Who should I notify about this completed task?',
                        },
                    },
                    {
                        type: 'input',
                        block_id: 'notify_user',
                        element: {
                            type: 'users_select',
                            action_id: 'user_select',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select a person to notify',
                            },
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Notify',
                        },
                        optional: true,
                    },
                ],
            },
        });
    } catch (error) {
        console.error('Error opening notification modal:', error);

        // Fallback: complete task silently
        try {
            const hasDatabase = isDatabaseAvailable();
            if (hasDatabase) {
                const { user } = await AuthService.authenticateUser('slack', userId);
                await TaskService.completeTask(action.value, user.id);
            }

            await client.chat.postMessage({
                channel: userId,
                text: '✅ Task completed!',
            });
        } catch (fallbackError) {
            console.error('Error in fallback completion:', fallbackError);
            await client.chat.postMessage({
                channel: userId,
                text: '❌ Sorry, there was an error completing the task.',
            });
        }
    }
};

export default handleTaskInteraction;
