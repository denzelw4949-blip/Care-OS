import AuthService from '../../../services/AuthService.js';
import TaskService from '../../../services/TaskService.js';

/**
 * Handle simple task creation (self-assigned)
 */
export const handleSimpleTaskCreation = async (client, triggerId) => {
    console.log('📝 handleSimpleTaskCreation called');
    console.log('Trigger ID:', triggerId);
    try {
        console.log('Attempting to open modal...');
        const result = await client.views.open({
            trigger_id: triggerId,
            view: {
                type: 'modal',
                callback_id: 'simple_task_modal',
                title: {
                    type: 'plain_text',
                    text: 'Create Task',
                },
                submit: {
                    type: 'plain_text',
                    text: 'Create',
                },
                blocks: [
                    {
                        type: 'input',
                        block_id: 'task_title',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'title_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'e.g., Complete project proposal',
                            },
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Task',
                        },
                    },
                ],
            },
        });
        console.log('✅ Modal opened successfully!', result);
    } catch (error) {
        console.error('❌ Error opening simple task modal:', error);
        console.error('Error details:', error.message);
        console.error('Error data:', error.data);
    }
};

/**
 * Handle simple task modal submission
 */
export const handleSimpleTaskSubmission = async (view, client, userId) => {
    try {
        const { user } = await AuthService.authenticateUser('slack', userId);
        const title = view.state.values.task_title?.title_input?.value;

        if (!title) {
            await client.chat.postMessage({
                channel: userId,
                text: '❌ Task title is required.',
            });
            return;
        }

        // Create self-assigned task
        await TaskService.createTask({
            assignedTo: user.id,
            assignedBy: user.id,
            title,
            description: '',
            priority: 3,
            approvalStatus: 'approved',
            requiresApproval: false,
        });

        await client.chat.postMessage({
            channel: userId,
            text: `✅ Task created: *${title}*`,
        });
    } catch (error) {
        console.error('Error creating simple task:', error);
        await client.chat.postMessage({
            channel: userId,
            text: '❌ Sorry, there was an error creating the task.',
        });
    }
};

/**
 * Handle task completion with user notification
 */
export const handleTaskCompletionWithNotification = async (view, client, userId) => {
    try {
        const metadata = JSON.parse(view.private_metadata);
        const taskId = metadata.taskId;
        const notifyUserId = view.state.values.notify_user?.user_select?.selected_user;

        const { user } = await AuthService.authenticateUser('slack', userId);

        // Mark task as complete
        await TaskService.completeTask(taskId, user.id);

        // Get task details
        const tasks = await TaskService.getUserTasks(user.id, user.id, user.role, {});
        const task = tasks.find(t => t.id === taskId);

        // Notify selected user if provided
        if (notifyUserId) {
            await client.chat.postMessage({
                channel: notifyUserId,
                text: `✅ *<@${userId}>* completed a task:\n\n*${task?.title || 'Task'}*${task?.description ? `\n${task.description}` : ''}`,
            });
        }

        // Confirm to user
        await client.chat.postMessage({
            channel: userId,
            text: notifyUserId ? `✅ Task completed! <@${notifyUserId}> has been notified.` : '✅ Task completed!',
        });
    } catch (error) {
        console.error('Error completing task with notification:', error);
        await client.chat.postMessage({
            channel: userId,
            text: '❌ Sorry, there was an error completing the task.',
        });
    }
};
