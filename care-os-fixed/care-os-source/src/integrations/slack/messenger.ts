// src/integrations/slack/messenger.ts
import { App } from '@slack/bolt';
import { config } from '../../config/index.js';
import { PlatformMessage } from '../../types/index.js';
import { adaptBlocks } from '../abstract/message-adapter.js';
import { PlatformType } from '@prisma/client';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('slack-messenger');

let slackApp: App | null = null;

export function getSlackApp(): App {
    if (!slackApp) {
        slackApp = new App({
            token: config.slack.botToken,
            signingSecret: config.slack.signingSecret,
            appToken: config.slack.appToken,
            socketMode: !!config.slack.appToken, // Use socket mode if app token provided
        });
    }
    return slackApp;
}

export async function sendSlackMessage(
    userId: string,
    message: PlatformMessage,
    channelId?: string
): Promise<void> {
    const app = getSlackApp();

    try {
        const payload: any = {
            channel: channelId || userId, // DM if no channel specified
            text: message.text,
        };

        if (message.blocks) {
            payload.blocks = adaptBlocks(message.blocks, PlatformType.SLACK);
        }

        await app.client.chat.postMessage(payload);
        logger.info('Slack message sent', { userId, channelId });
    } catch (error) {
        logger.error('Failed to send Slack message', { error, userId });
        throw error;
    }
}

export async function sendEphemeralMessage(
    userId: string,
    channelId: string,
    message: PlatformMessage
): Promise<void> {
    const app = getSlackApp();

    try {
        await app.client.chat.postEphemeral({
            channel: channelId,
            user: userId,
            text: message.text,
            blocks: message.blocks ? adaptBlocks(message.blocks, PlatformType.SLACK) : undefined,
        });
    } catch (error) {
        logger.error('Failed to send ephemeral Slack message', { error, userId });
        throw error;
    }
}
