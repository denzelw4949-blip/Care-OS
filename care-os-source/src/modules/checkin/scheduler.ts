// src/modules/checkin/scheduler.ts
import cron from 'node-cron';
import { prisma } from '../../database/index.js';
import { config } from '../../config/index.js';
import { startCheckinFlow } from '../../flows/checkin-flow.js';
import { createLogger } from '../../utils/logger.js';
import { detectDeviations } from '../deviation/detector.js';
import { sendDeviationAlerts } from '../deviation/notifications.js';

const logger = createLogger('checkin-scheduler');

/**
 * Schedule daily check-in prompts
 */
export function startCheckinScheduler(): void {
    // Default: 9 AM weekdays
    cron.schedule(config.checkinSchedule, async () => {
        logger.info('Running scheduled check-in prompts');

        try {
            const users = await prisma.user.findMany({
                where: { role: 'EMPLOYEE' },
            });

            for (const user of users) {
                try {
                    await startCheckinFlow(
                        user.id,
                        user.platformId,
                        user.platformId, // DM channel
                        user.platformType
                    );
                } catch (error) {
                    logger.error('Failed to send check-in to user', { userId: user.id, error });
                }
            }

            logger.info(`Sent check-in prompts to ${users.length} users`);
        } catch (error) {
            logger.error('Check-in scheduler failed', { error });
        }
    });

    logger.info('Check-in scheduler started', { schedule: config.checkinSchedule });
}

/**
 * Schedule deviation detection (runs daily at midnight)
 */
export function startDeviationScheduler(): void {
    cron.schedule('0 0 * * *', async () => {
        logger.info('Running deviation detection');

        try {
            const deviations = await detectDeviations();
            logger.info(`Detected ${deviations.length} deviations`);

            // Send alerts to managers
            await sendDeviationAlerts();
        } catch (error) {
            logger.error('Deviation detection failed', { error });
        }
    });

    logger.info('Deviation detection scheduler started');
}
