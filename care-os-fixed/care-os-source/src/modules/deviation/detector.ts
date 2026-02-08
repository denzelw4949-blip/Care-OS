// src/modules/deviation/detector.ts
import { prisma } from '../../database/index.js';
import { DeviationSeverity } from '@prisma/client';
import { createLogger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

const logger = createLogger('deviation-detector');

interface DeviationPattern {
    userId: string;
    type: string;
    severity: DeviationSeverity;
    description: string;
}

/**
 * Analyze check-in patterns and detect significant deviations
 */
export async function detectDeviations(): Promise<DeviationPattern[]> {
    logger.info('Running deviation detection');

    const lookbackDays = config.deviationLookbackDays;
    const thresholdPercent = config.deviationThresholdPercent;
    const lookbackStart = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const deviations: DeviationPattern[] = [];

    // Get all users
    const users = await prisma.user.findMany({
        where: { role: 'EMPLOYEE' },
    });

    for (const user of users) {
        // Get recent check-ins
        const checkins = await prisma.checkIn.findMany({
            where: {
                userId: user.id,
                timestamp: { gte: lookbackStart },
            },
            orderBy: { timestamp: 'desc' },
        });

        if (checkins.length === 0) continue;

        // 1. Mood Drop Detection
        const moodDeviation = detectMoodDrop(checkins);
        if (moodDeviation) {
            deviations.push({ userId: user.id, ...moodDeviation });
        }

        // 2. sustained Low Mood
        const lowMoodDeviation = detectSustainedLowMood(checkins);
        if (lowMoodDeviation) {
            deviations.push({ userId: user.id, ...lowMoodDeviation });
        }

        // 3. High Workload
        const workloadDeviation = detectHighWorkload(checkins);
        if (workloadDeviation) {
            deviations.push({ userId: user.id, ...workloadDeviation });
        }

        // 4. Missed Check-ins
        const missedCheckins = detectMissedCheckins(user.id, checkins, lookbackDays);
        if (missedCheckins) {
            deviations.push({ userId: user.id, ...missedCheckins });
        }
    }

    // Create deviation records in database
    for (const deviation of deviations) {
        // Check if similar deviation already exists and is unresolved
        const existing = await prisma.deviation.findFirst({
            where: {
                userId: deviation.userId,
                type: deviation.type,
                resolved: false,
                detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
        });

        if (!existing) {
            await prisma.deviation.create({
                data: deviation,
            });
            logger.info('Deviation detected', deviation);
        }
    }

    return deviations;
}

function detectMoodDrop(checkins: any[]): Omit<DeviationPattern, 'userId'> | null {
    if (checkins.length < 3) return null;

    const recent3 = checkins.slice(0, 3);
    const recentAvg = recent3.reduce((sum, c) => sum + c.moodScore, 0) / 3;

    const older = checkins.slice(3, 10);
    if (older.length === 0) return null;

    const baselineAvg = older.reduce((sum, c) => sum + c.moodScore, 0) / older.length;

    const drop = baselineAvg - recentAvg;

    if (drop >= 2) {
        return {
            type: 'mood_drop',
            severity: drop >= 4 ? DeviationSeverity.CRITICAL : drop >= 3 ? DeviationSeverity.HIGH : DeviationSeverity.MEDIUM,
            description: `Mood score dropped by ${drop.toFixed(1)} points over recent check-ins`,
        };
    }

    return null;
}

function detectSustainedLowMood(checkins: any[]): Omit<DeviationPattern, 'userId'> | null {
    const recent5 = checkins.slice(0, 5);
    if (recent5.length < 5) return null;

    const lowMoodCount = recent5.filter(c => c.moodScore < 4).length;

    if (lowMoodCount >= 4) {
        return {
            type: 'sustained_low_mood',
            severity: DeviationSeverity.HIGH,
            description: `Reported low mood (< 4/10) in ${lowMoodCount} of last 5 check-ins`,
        };
    }

    return null;
}

function detectHighWorkload(checkins: any[]): Omit<DeviationPattern, 'userId'> | null {
    const recent3 = checkins.slice(0, 3);
    if (recent3.length < 3) return null;

    const highWorkloadCount = recent3.filter(c => c.workloadLevel > 8).length;

    if (highWorkloadCount >= 3) {
        return {
            type: 'high_workload',
            severity: DeviationSeverity.HIGH,
            description: `Reported high workload (> 8/10) for 3+ consecutive check-ins`,
        };
    }

    return null;
}

function detectMissedCheckins(userId: string, checkins: any[], lookbackDays: number): Omit<DeviationPattern, 'userId'> | null {
    // Expected check-ins (weekdays only, assuming daily check-ins)
    const expectedCheckins = Math.floor((lookbackDays / 7) * 5); // ~5 per week
    const actualCheckins = checkins.length;

    const missedCount = Math.max(0, expectedCheckins - actualCheckins);

    if (missedCount >= 3) {
        return {
            type: 'missed_checkins',
            severity: missedCount >= 5 ? DeviationSeverity.MEDIUM : DeviationSeverity.LOW,
            description: `Missed ${missedCount} check-ins in the last ${lookbackDays} days`,
        };
    }

    return null;
}
