// src/integrations/abstract/message-adapter.ts
import { PlatformType } from '@prisma/client';
import { PlatformMessage } from '../../types/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('message-adapter');

/**
 * Platform-agnostic message interface
 * Routes messages to the appropriate platform integration
 */
export async function sendMessageToUser(params: {
    platformId: string;
    platformType: PlatformType;
    message: PlatformMessage;
    channelId?: string;
}): Promise<void> {
    const { platformId, platformType, message, channelId } = params;

    logger.info('Sending message', { platformType, platformId });

    try {
        if (platformType === PlatformType.SLACK) {
            const { sendSlackMessage } = await import('../slack/messenger.js');
            await sendSlackMessage(platformId, message, channelId);
        } else if (platformType === PlatformType.TEAMS) {
            const { sendTeamsMessage } = await import('../teams/messenger.js');
            await sendTeamsMessage(platformId, message);
        } else {
            throw new Error(`Unsupported platform type: ${platformType}`);
        }
    } catch (error) {
        logger.error('Failed to send message', { error, platformType });
        throw error;
    }
}

/**
 * Convert platform-agnostic blocks to platform-specific format
 */
export function adaptBlocks(blocks: any[], platformType: PlatformType): any {
    if (platformType === PlatformType.SLACK) {
        return adaptToSlackBlocks(blocks);
    } else if (platformType === PlatformType.TEAMS) {
        return adaptToTeamsCards(blocks);
    }
    return blocks;
}

function adaptToSlackBlocks(blocks: any[]): any[] {
    // Already in Slack Block Kit format - pass through
    return blocks.map(block => {
        if (block.type === 'section' && block.text && typeof block.text === 'string') {
            return {
                ...block,
                text: {
                    type: 'mrkdwn',
                    text: block.text,
                },
            };
        }
        if (block.fields) {
            return {
                ...block,
                fields: block.fields.map((f: any) => ({
                    type: 'mrkdwn',
                    text: `*${f.label}*\n${f.value}`,
                })),
            };
        }
        return block;
    });
}

function adaptToTeamsCards(blocks: any[]): any {
    // Convert to Teams Adaptive Cards format
    const body: any[] = [];

    for (const block of blocks) {
        if (block.type === 'section') {
            body.push({
                type: 'TextBlock',
                text: typeof block.text === 'string' ? block.text : block.text?.text || '',
                wrap: true,
            });

            if (block.fields) {
                const facts = block.fields.map((f: any) => ({
                    title: f.label,
                    value: f.value,
                }));
                body.push({
                    type: 'FactSet',
                    facts,
                });
            }
        }

        if (block.type === 'divider') {
            // Teams doesn't have divider, use container with separator
            body.push({
                type: 'Container',
                separator: true,
                items: [],
            });
        }

        if (block.type === 'actions') {
            const actions = block.actions?.map((action: any) => ({
                type: 'Action.Submit',
                title: action.text,
                data: { value: action.value, id: action.id },
            })) || [];

            body.push({
                type: 'ActionSet',
                actions,
            });
        }
    }

    return {
        type: 'AdaptiveCard',
        version: '1.5',
        body,
    };
}
