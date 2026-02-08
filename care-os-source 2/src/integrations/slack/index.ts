// src/integrations/slack/index.ts
import { App } from '@slack/bolt';
import { config } from '../../config/index.js';
import { createLogger } from '../../utils/logger.js';
import { handleCheckinCommand, handleMyTasksCommand, handleRecognizeCommand } from './commands.js';
import { handleMoodSelection, handleWorkloadSelection } from '../../flows/checkin-flow.js';
import { authenticateUser } from '../../auth/platform-auth.js';
import { PlatformType } from '@prisma/client';
import { TaskStatus } from '@prisma/client';
import { prisma } from '../../database/index.js';

const logger = createLogger('slack-integration');

let slackApp: App | null = null;

export function initializeSlackApp(): App {
    if (slackApp) return slackApp;

    const app = new App({
        token: config.slack.botToken,
        signingSecret: config.slack.signingSecret,
        appToken: config.slack.appToken,
        socketMode: !!config.slack.appToken,
    });

    // Register slash commands
    app.command('/checkin', handleCheckinCommand);
    app.command('/mytasks', handleMyTasksCommand);
    app.command('/recognize', handleRecognizeCommand);

    // Handle button interactions for check-in flow
    app.action(/^mood_\d+$/, async ({ action, ack, body, client }) => {
        await ack();

        if (action.type !== 'button') return;

        const moodScore = parseInt(action.value);
        const user = await authenticateUser(body.user.id, PlatformType.SLACK);

        await handleMoodSelection(
            user.id,
            body.user.id,
            (body as any).channel?.id || (body as any).container?.channel_id,
            PlatformType.SLACK,
            moodScore
        );
    });

    app.action(/^workload_\d+$/, async ({ action, ack, body }) => {
        await ack();

        if (action.type !== 'button') return;

        const workloadLevel = parseInt(action.value);
        const user = await authenticateUser(body.user.id, PlatformType.SLACK);

        await handleWorkloadSelection(
            user.id,
            body.user.id,
            (body as any).channel?.id || (body as any).container?.channel_id,
            PlatformType.SLACK,
            workloadLevel
        );
    });

    // Handle task completion button
    app.action(/^complete_task_/, async ({ action, ack, client, body }) => {
        await ack();

        if (action.type !== 'button') return;

        const taskId = action.value;

        await prisma.task.update({
            where: { id: taskId },
            data: { status: TaskStatus.COMPLETED, completedAt: new Date() },
        });

        await client.chat.postEphemeral({
            channel: (body as any).channel?.id,
            user: body.user.id,
            text: '✅ Task marked as complete!',
        });
    });

    // Handle recognition modal submission
    app.view('recognition_modal', async ({ ack, body, view, client }) => {
        await ack();

        const fromUser = await authenticateUser(body.user.id, PlatformType.SLACK);

        const recipientId = view.state.values.recipient.recipient_user.selected_user;
        const message = view.state.values.message.recognition_message.value || '';
        const isPublic = view.state.values.visibility.visibility_select.selected_option?.value === 'public';

        const toUser = await authenticateUser(recipientId, PlatformType.SLACK);

        await prisma.recognition.create({
            data: {
                fromUserId: fromUser.id,
                toUserId: toUser.id,
                message,
                isPublic,
            },
        });

        logger.info('Recognition sent via modal', { fromUser: fromUser.id, toUser: toUser.id });
    });

    logger.info('Slack app initialized');
    slackApp = app;
    return app;
}

export async function startSlackApp(): Promise<void> {
    const app = initializeSlackApp();

    await app.start();
    logger.info('Slack app started');
}
