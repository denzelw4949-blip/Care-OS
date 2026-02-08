// src/integrations/slack/commands.ts
import { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { authenticateUser } from '../../auth/platform-auth.js';
import { PlatformType } from '@prisma/client';
import { createConversationState } from '../../flows/conversation-state.js';
import { startCheckinFlow } from '../../flows/checkin-flow.js';
import { prisma } from '../../database/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('slack-commands');

type SlackCommandArgs = SlackCommandMiddlewareArgs & AllMiddlewareArgs;

/**
 * /checkin - Start daily check-in flow
 */
export async function handleCheckinCommand({ command, ack, client }: SlackCommandArgs) {
    await ack();

    try {
        // Authenticate user
        const user = await authenticateUser(
            command.user_id,
            PlatformType.SLACK,
            undefined,
            command.user_name
        );

        // Create conversation state
        await createConversationState(
            user.id,
            PlatformType.SLACK,
            command.channel_id,
            'checkin'
        );

        // Start check-in flow
        await startCheckinFlow(user.id, command.user_id, command.channel_id, PlatformType.SLACK);
    } catch (error) {
        logger.error('Failed to handle checkin command', { error });
        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: command.user_id,
            text: '❌ Sorry, something went wrong. Please try again.',
        });
    }
}

/**
 * /mytasks - View assigned tasks
 */
export async function handleMyTasksCommand({ command, ack, client }: SlackCommandArgs) {
    await ack();

    try {
        const user = await authenticateUser(command.user_id, PlatformType.SLACK);

        const tasks = await prisma.task.findMany({
            where: { assignedTo: user.id, status: { not: 'COMPLETED' } },
            orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
            take: 10,
        });

        if (tasks.length === 0) {
            await client.chat.postEphemeral({
                channel: command.channel_id,
                user: command.user_id,
                text: '✅ You have no pending tasks!',
            });
            return;
        }

        const blocks: any[] = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Your Tasks (${tasks.length})*`,
                },
            },
            { type: 'divider' },
        ];

        for (const task of tasks) {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*${task.title}*\n${task.description || 'No description'}\nDue: ${task.dueDate ? task.dueDate.toLocaleDateString() : 'No due date'
                        }`,
                },
                accessory: {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Complete' },
                    action_id: `complete_task_${task.id}`,
                    value: task.id,
                },
            });
        }

        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: command.user_id,
            blocks,
            text: `You have ${tasks.length} pending tasks`,
        });
    } catch (error) {
        logger.error('Failed to handle mytasks command', { error });
    }
}

/**
 * /recognize - Send peer recognition
 */
export async function handleRecognizeCommand({ command, ack, client }: SlackCommandArgs) {
    await ack();

    try {
        // Open a modal for recognition
        await client.views.open({
            trigger_id: command.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'recognition_modal',
                title: { type: 'plain_text', text: 'Send Recognition' },
                submit: { type: 'plain_text', text: 'Send' },
                blocks: [
                    {
                        type: 'input',
                        block_id: 'recipient',
                        label: { type: 'plain_text', text: 'Recognize' },
                        element: {
                            type: 'users_select',
                            action_id: 'recipient_user',
                            placeholder: { type: 'plain_text', text: 'Select a person' },
                        },
                    },
                    {
                        type: 'input',
                        block_id: 'message',
                        label: { type: 'plain_text', text: 'Message' },
                        element: {
                            type: 'plain_text_input',
                            action_id: 'recognition_message',
                            multiline: true,
                            placeholder: { type: 'plain_text', text: 'What are you recognizing them for?' },
                        },
                    },
                    {
                        type: 'input',
                        block_id: 'visibility',
                        label: { type: 'plain_text', text: 'Visibility' },
                        element: {
                            type: 'static_select',
                            action_id: 'visibility_select',
                            options: [
                                { text: { type: 'plain_text', text: 'Public (visible to all)' }, value: 'public' },
                                { text: { type: 'plain_text', text: 'Private (just to recipient)' }, value: 'private' },
                            ],
                            initial_option: { text: { type: 'plain_text', text: 'Public (visible to all)' }, value: 'public' },
                        },
                    },
                ],
            },
        });
    } catch (error) {
        logger.error('Failed to handle recognize command', { error });
    }
}
