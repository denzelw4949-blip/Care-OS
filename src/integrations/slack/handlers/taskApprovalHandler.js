import AuthService from '../../../services/AuthService.js';
import TaskService from '../../../services/TaskService.js';
import { isDatabaseAvailable } from '../../../database/dbStatus.js';

/**
 * Handle task approval action
 */
export const handleTaskApproval = async (action, client, userId) => {
    try {
        const taskId = action.value;
        const actionId = action.action_id;

        const { user: manager } = await AuthService.authenticateUser('slack', userId);

        if (actionId === 'approve_task') {
            // Approve the task
            await TaskService.approveTask(taskId, manager.id);

            // Get task details to notify assignee
            const tasks = await TaskService.getUserTasks(manager.id, manager.id, manager.role, {});
            const task = tasks.find(t => t.id === taskId);

            if (task) {
                // Notify assignee
                const assignee = await AuthService.getUserByInternalId(task.assigned_to);
                if (assignee && assignee.slack_user_id) {
                    await client.chat.postMessage({
                        channel: assignee.slack_user_id,
                        text: `✅ Great news! Your task "*${task.title}*" has been approved by <@${userId}>!\n\nYou can now start working on it.`,
                    });
                }
            }

            // Confirm to manager
            await client.chat.postMessage({
                channel: userId,
                text: `✅ Task approved successfully!`,
            });

        } else if (actionId === 'reject_task') {
            // Reject the task
            await TaskService.rejectTask(taskId, manager.id);

            // Get task details to notify assignee
            const tasks = await TaskService.getUserTasks(manager.id, manager.id, manager.role, {});
            const task = tasks.find(t => t.id === taskId);

            if (task) {
                // Notify assignee
                const assignee = await AuthService.getUserByInternalId(task.assigned_to);
                if (assignee && assignee.slack_user_id) {
                    await client.chat.postMessage({
                        channel: assignee.slack_user_id,
                        text: `❌ Your task "*${task.title}*" was not approved by <@${userId}>.\n\nPlease discuss with your manager to understand the reasoning.`,
                    });
                }
            }

            // Confirm to manager
            await client.chat.postMessage({
                channel: userId,
                text: `❌ Task rejected.`,
            });
        }

    } catch (error) {
        console.error('Error handling task approval:', error);
        await client.chat.postMessage({
            channel: userId,
            text: '❌ Sorry, there was an error processing the approval action.',
        });
    }
};

/**
 * Handle "Share this win?" prompt after task completion
 */
export const handleShareWinPrompt = async (taskId, userId, client) => {
    try {
        await client.views.open({
            trigger_id: client.triggerId, // This needs to be passed from the complete button click
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
        // Fallback: just complete the task privately
        await completeTaskSilently(taskId, userId, client);
    }
};

/**
 * Handle share win modal submission
 */
export const handleShareWinSubmission = async (view, client, userId) => {
    try {
        const metadata = JSON.parse(view.private_metadata);
        const taskId = metadata.taskId;
        const values = view.state.values;
        const shareChoice = values.share_choice?.share_select?.selected_option?.value;

        const { user } = await AuthService.authenticateUser('slack', userId);

        // Mark task as complete
        await TaskService.completeTask(taskId, user.id);

        // Get task details
        const tasks = await TaskService.getUserTasks(user.id, user.id, user.role, {});
        const task = tasks.find(t => t.id === taskId);

        if (shareChoice === 'public' && task) {
            // Share publicly
            await TaskService.markCompletionShared(taskId, true);

            await client.chat.postMessage({
                channel: 'general',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `🎉 *<@${userId}>* just completed a task!`,
                        },
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `✅ *${task.title}*\n${task.description || '_No description_'}`,
                        },
                    },
                    {
                        type: 'context',
                        elements: [
                            {
                                type: 'mrkdwn',
                                text: '💪 Keep up the great work!',
                            },
                        ],
                    },
                ],
            });

            // Confirm to user
            await client.chat.postMessage({
                channel: userId,
                text: '🎉 Task completed and shared with the team!',
            });

        } else {
            // Keep private, notify manager only
            await TaskService.markCompletionShared(taskId, false);

            const manager = await TaskService.getUserManager(user.id);
            if (manager && manager.slack_user_id) {
                await client.chat.postMessage({
                    channel: manager.slack_user_id,
                    text: `✅ *<@${userId}>* completed a task:\n\n*${task?.title || 'Task'}*\n${task?.description || ''}`,
                });
            }

            // Confirm to user
            await client.chat.postMessage({
                channel: userId,
                text: '✅ Task completed! Your manager has been notified.',
            });
        }

    } catch (error) {
        console.error('Error handling share win submission:', error);
        await client.chat.postMessage({
            channel: userId,
            text: '❌ Sorry, there was an error completing the task.',
        });
    }
};

/**
 * Complete task silently (fallback)
 */
async function completeTaskSilently(taskId, userId, client) {
    try {
        const { user } = await AuthService.authenticateUser('slack', userId);
        await TaskService.completeTask(taskId, user.id);

        await client.chat.postMessage({
            channel: userId,
            text: '✅ Task completed!',
        });
    } catch (error) {
        console.error('Error completing task silently:', error);
    }
}
