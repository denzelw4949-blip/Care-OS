// src/integrations/teams/messenger.ts
import { PlatformMessage } from '../../types/index.js';
import { adaptBlocks } from '../abstract/message-adapter.js';
import { PlatformType } from '@prisma/client';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('teams-messenger');

/**
 * Send message via Microsoft Teams
 * Note: This is a placeholder - full Teams integration requires Bot Framework setup
 */
export async function sendTeamsMessage(
    userId: string,
    message: PlatformMessage
): Promise<void> {
    logger.info('Teams message queued', { userId });

    // TODO: Implement with Microsoft Bot Framework
    // This would use the Bot Framework SDK to send messages
    // Similar pattern to Slack but using Teams connectors and adaptive cards

    const adaptiveCard = message.blocks
        ? adaptBlocks(message.blocks, PlatformType.TEAMS)
        : null;

    logger.debug('Adaptive card generated', { card: adaptiveCard });

    // Placeholder - would actually send via Bot Framework
    console.log('Would send Teams message:', { userId, message: message.text, card: adaptiveCard });
}
