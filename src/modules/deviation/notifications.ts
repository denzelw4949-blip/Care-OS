// src/modules/deviation/notifications.ts
import { prisma } from '../../database/index.js';
import { createLogger } from '../../utils/logger.js';
import { sendMessageToUser } from '../../integrations/abstract/message-adapter.js';

const logger = createLogger('deviation-notifications');

/**
 * Check for unnotified deviations and send alerts to managers
 */
export async function sendDeviationAlerts(): Promise<void> {
    logger.info('Checking for deviation alerts to send');

    const deviations = await prisma.deviation.findMany({
        where: {
            managerNotified: false,
            resolved: false,
        },
        include: {
            user: {
                select: {
                    id: true,
                    displayName: true,
                    email: true,
                    managerId: true,
                    manager: {
                        select: {
                            id: true,
                            platformId: true,
                            platformType: true,
                            displayName: true,
                        },
                    },
                },
            },
        },
    });

    for (const deviation of deviations) {
        if (!deviation.user.manager) {
            logger.warn('User has no manager assigned, skipping notification', { userId: deviation.userId });
            continue;
        }

        try {
            // Send private message to manager
            await sendMessageToUser({
                platformId: deviation.user.manager.platformId,
                platformType: deviation.user.manager.platformType,
                message: {
                    text: `🔔 Wellbeing Check-in Prompt`,
                    blocks: [
                        {
                            type: 'section',
                            text: `You have a new wellbeing alert for ${deviation.user.displayName || 'a team member'}`,
                        },
                        {
                            type: 'section',
                            fields: [
                                { label: 'Type', value: formatDeviationType(deviation.type) },
                                { label: 'Severity', value: deviation.severity },
                                { label: 'Details', value: deviation.description },
                                { label: 'Detected', value: deviation.detectedAt.toLocaleDateString() },
                            ],
                        },
                        {
                            type: 'section',
                            text: `**Suggested Actions:**\n• Schedule a private 1:1 conversation\n• Ask open-ended questions about workload and wellbeing\n• Offer support resources or adjust workload if needed\n• This is not a performance issue—focus on support`,
                        },
                    ],
                    ephemeral: true,
                },
            });

            // Mark as notified
            await prisma.deviation.update({
                where: { id: deviation.id },
                data: {
                    managerNotified: true,
                    notifiedAt: new Date(),
                },
            });

            logger.info('Deviation alert sent to manager', {
                deviationId: deviation.id,
                managerId: deviation.user.managerId,
            });
        } catch (error) {
            logger.error('Failed to send deviation alert', { error, deviationId: deviation.id });
        }
    }
}

function formatDeviationType(type: string): string {
    const formats: Record<string, string> = {
        mood_drop: 'Mood Score Drop',
        sustained_low_mood: 'Sustained Low Mood',
        high_workload: 'High Workload Reported',
        missed_checkins: 'Missed Check-ins',
    };
    return formats[type] || type;
}
