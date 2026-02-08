import AuthService from '../../../services/AuthService.js';
import TaskService from '../../../services/TaskService.js';
import { isDatabaseAvailable } from '../../../database/dbStatus.js';

/**
 * Handle /add-task command - Create new tasks
 */
export const handleAddTaskCommand = async (command, ack, client) => {
    await ack();

    try {
        const hasDatabase = isDatabaseAvailable();

        if (!hasDatabase) {
            await client.chat.postMessage({
                channel: command.user_id,
                text: '❌ Task creation requires database connection. Please try again later.',
            });
            return;
        }

        // Authenticate user
        const { user } = await AuthService.authenticateUser('slack', command.user_id);
        const isManager = user.role === 'manager' || user.role === 'admin';

        // Open task creation modal
        await client.views.open({
            trigger_id: command.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'add_task_modal',
                title: {
                    type: 'plain_text',
                    text: 'Create Task',
                },
                submit: {
                    type: 'plain_text',
                    text: 'Create',
                },
                private_metadata: JSON.stringify({
                    userRole: user.role,
                    userId: user.id
                }),
                blocks: [
                    // Employee selector (only for managers)
                    ...(isManager ? [{
                        type: 'input',
                        block_id: 'assignee',
                        element: {
                            type: 'users_select',
                            action_id: 'assignee_select',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select team member',
                            },
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Assign to',
                        },
                    }] : [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: user.role === 'junior'
                                    ? '📝 *Creating a self-assigned task*\n_As a junior team member, this task will require manager approval._'
                                    : '📝 *Creating a self-assigned task*\n_This task will be automatically approved._'
                            }
                        }
                    ]),
                    {
                        type: 'input',
                        block_id: 'title',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'title_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'e.g., Complete Q1 report',
                            },
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Task Title',
                        },
                    },
                    {
                        type: 'input',
                        block_id: 'description',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'description_input',
                            multiline: true,
                            placeholder: {
                                type: 'plain_text',
                                text: 'Describe what needs to be done...',
                            },
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Description',
                        },
                        optional: true,
                    },
                    {
                        type: 'input',
                        block_id: 'priority',
                        element: {
                            type: 'static_select',
                            action_id: 'priority_select',
                            options: [
                                {
                                    text: { type: 'plain_text', text: '🔴 High Priority' },
                                    value: '5',
                                },
                                {
                                    text: { type: 'plain_text', text: '🟡 Medium Priority' },
                                    value: '3',
                                },
                                {
                                    text: { type: 'plain_text', text: '🟢 Low Priority' },
                                    value: '1',
                                },
                            ],
                            initial_option: {
                                text: { type: 'plain_text', text: '🟡 Medium Priority' },
                                value: '3',
                            },
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Priority',
                        },
                    },
                    {
                        type: 'input',
                        block_id: 'due_date',
                        element: {
                            type: 'datepicker',
                            action_id: 'due_date_select',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select a date',
                            },
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Due Date',
                        },
                        optional: true,
                    },
                ],
            },
        });
    } catch (error) {
        console.error('Error opening add-task modal:', error);
        await client.chat.postMessage({
            channel: command.user_id,
            text: '❌ Sorry, there was an error opening the task form.',
        });
    }
};

/**
 * Handle task creation modal submission
 */
export const handleAddTaskSubmission = async (view, client, userId) => {
    try {
        const metadata = JSON.parse(view.private_metadata);
        const values = view.state.values;

        const { user: creator } = await AuthService.authenticateUser('slack', userId);
        const isManager = creator.role === 'manager' || creator.role === 'admin';

        // Get form values
        const assigneeSlackId = values.assignee?.assignee_select?.selected_user || userId;
        const title = values.title?.title_input?.value;
        const description = values.description?.description_input?.value || '';
        const priority = parseInt(values.priority?.priority_select?.selected_option?.value || '3', 10);
        const dueDate = values.due_date?.due_date_select?.selected_date || null;

        // Authenticate assignee
        const { user: assignee } = await AuthService.authenticateUser('slack', assigneeSlackId);

        // Determine approval status
        let approvalStatus = 'approved';
        let requiresApproval = false;

        if (!isManager) {
            // Self-assigned task
            if (creator.role === 'junior') {
                approvalStatus = 'pending';
                requiresApproval = true;
            }
        }

        // Create task
        const task = await TaskService.createTask({
            assignedTo: assignee.id,
            assignedBy: creator.id,
            title,
            description,
            priority,
            dueDate,
            approvalStatus,
            requiresApproval,
        });

        // Send notifications
        if (requiresApproval) {
            // Notify manager for approval
            const manager = await TaskService.getUserManager(creator.id);
            if (manager && manager.slack_user_id) {
                await client.chat.postMessage({
                    channel: manager.slack_user_id,
                    blocks: [
                        {
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: '⏳ Task Approval Required',
                            },
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `*<@${userId}>* created a self-assigned task that requires your approval:\n\n*${title}*\n${description}`,
                            },
                        },
                        {
                            type: 'actions',
                            elements: [
                                {
                                    type: 'button',
                                    text: { type: 'plain_text', text: '✅ Approve' },
                                    style: 'primary',
                                    value: task.id,
                                    action_id: 'approve_task',
                                },
                                {
                                    type: 'button',
                                    text: { type: 'plain_text', text: '❌ Reject' },
                                    style: 'danger',
                                    value: task.id,
                                    action_id: 'reject_task',
                                },
                            ],
                        },
                    ],
                });
            }

            // Notify creator
            await client.chat.postMessage({
                channel: userId,
                text: '⏳ Your task has been submitted for manager approval.',
            });
        } else {
            // Task approved automatically
            if (assigneeSlackId !== userId) {
                // Notify assignee
                await client.chat.postMessage({
                    channel: assigneeSlackId,
                    text: `📋 *<@${userId}>* assigned you a new task:\n\n*${title}*\n${description}\n\n${dueDate ? `📅 Due: ${dueDate}` : ''}`,
                });
            }

            // Confirm to creator
            await client.chat.postMessage({
                channel: userId,
                text: `✅ Task created successfully${assigneeSlackId !== userId ? ` and assigned to <@${assigneeSlackId}>` : ''}!`,
            });
        }

    } catch (error) {
        console.error('Error creating task:', error);
        await client.chat.postMessage({
            channel: userId,
            text: '❌ Sorry, there was an error creating the task.',
        });
    }
};
