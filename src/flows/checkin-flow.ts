// src/flows/checkin-flow.ts
import { PlatformType } from '@prisma/client';
import { getConversationState, updateConversationState, clearConversationState } from './conversation-state.js';
import { sendMessageToUser } from '../integrations/abstract/message-adapter.js';
import { prisma } from '../database/index.js';
import { CheckInVisibility } from '@prisma/client';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('checkin-flow');

/**
 * Start the check-in conversation flow
 */
export async function startCheckinFlow(
    userId: string,
    platformUserId: string,
    channelId: string,
    platformType: PlatformType
): Promise<void> {
    logger.info('Starting check-in flow', { userId, platformType });

    await sendMessageToUser({
        platformId: platformUserId,
        platformType,
        message: {
            text: '👋 Time for your daily check-in!',
            blocks: [
                {
                    type: 'section',
                    text: '👋 *Daily Check-in*\n\nHow are you feeling today? (1 = terrible, 10 = amazing)',
                },
                {
                    type: 'actions',
                    actions: [
                        { id: 'mood_1', text: '1', value: '1' },
                        { id: 'mood_2', text: '2', value: '2' },
                        { id: 'mood_3', text: '3', value: '3' },
                        { id: 'mood_4', text: '4', value: '4' },
                        { id: 'mood_5', text: '5', value: '5' },
                        { id: 'mood_6', text: '6', value: '6' },
                        { id: 'mood_7', text: '7', value: '7' },
                        { id: 'mood_8', text: '8', value: '8' },
                        { id: 'mood_9', text: '9', value: '9' },
                        { id: 'mood_10', text: '10', value: '10', style: 'primary' },
                    ],
                },
            ],
        },
        channelId,
    });
}

/**
 * Handle mood selection and move to workload step
 */
export async function handleMoodSelection(
    userId: string,
    platformUserId: string,
    channelId: string,
    platformType: PlatformType,
    moodScore: number
): Promise<void> {
    await updateConversationState(platformType, userId, channelId, {
        currentStep: 'WORKLOAD',
        data: { moodScore },
    });

    await sendMessageToUser({
        platformId: platformUserId,
        platformType,
        message: {
            text: 'How's your workload?',
      blocks: [
                {
                    type: 'section',
                    text: `Great! You selected ${moodScore}/10.\n\n*How's your workload today?* (1 = very light, 10 = overwhelming)`,
                },
                {
                    type: 'actions',
                    actions: Array.from({ length: 10 }, (_, i) => ({
                        id: `workload_${i + 1}`,
                        text: String(i + 1),
                        value: String(i + 1),
                        ...(i === 9 ? { style: 'danger' } : {}),
                    })),
                },
      ],
        },
        channelId,
    });
}

/**
 * Handle workload selection and complete check-in
 */
export async function handleWorkloadSelection(
    userId: string,
    platformUserId: string,
    channelId: string,
    platformType: PlatformType,
    workloadLevel: number
): Promise<void> {
    const state = await getConversationState(platformType, userId, channelId);
    if (!state || !state.data.moodScore) {
        logger.error('Invalid state for workload selection');
        return;
    }

    // Complete check-in with default visibility
    await prisma.checkIn.create({
        data: {
            userId,
            moodScore: state.data.moodScore,
            workloadLevel,
            visibility: CheckInVisibility.MANAGER,
        },
    });

    await clearConversationState(platformType, userId, channelId);

    await sendMessageToUser({
        platformId: platformUserId,
        platformType,
        message: {
            text: '✅ Check-in complete!',
            blocks: [
                {
                    type: 'section',
                    text: `✅ *Check-in complete!*\n\nMood: ${state.data.moodScore}/10\nWorkload: ${workloadLevel}/10\n\nYour data visibility is set to *Manager* (you can change this in settings).`,
                },
            ],
        },
        channelId,
    });

    logger.info('Check-in completed', { userId, mood: state.data.moodScore, workload: workloadLevel });
}
