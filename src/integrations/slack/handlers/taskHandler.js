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
/**
 * Handle task completion button click - now triggers "Share win?" modal
 */
export const handleTaskCompletion = async (action, client, userId) => {
    try {
        const taskId = action.value;

        // Open "Share this win?" modal
        await client.views.open({
            trigger_id: action.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'share_win_modal',
                title: {
                    type: 'plain_text',
                    text: '🎉 Task Complete!',
                },
                submit: {
                    type: 'plain_text',
                    text: 'Confirm',
                },
                private_metadata: JSON.stringify({ taskId }),
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '🎉 *Congratulations on completing your task!*\n\nWould you like to share this achievement with the team?',
                        },
                    },
                    {
                        type: 'input',
                        block_id: 'share_choice',
                        element: {
                            type: 'radio_buttons',
                            action_id: 'share_select',
                            options: [
                                {
                                    text: { type: 'plain_text', text: '✨ Yes, share publicly with the team!' },
                                    value: 'public',
                                },
                                {
                                    text: { type: 'plain_text', text: '🔒 No, keep it private (notify manager only)' },
                                    value: 'private',
                                },
                            ],
                            initial_option: {
                                text: { type: 'plain_text', text: '✨ Yes, share publicly with the team!' },
                                value: 'public',
                            },
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Share this win?',
                        },
                    },
                ],
            },
        });
    } catch (error) {
        console.error('Error opening share win modal:', error);

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
