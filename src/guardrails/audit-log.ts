// src/guardrails/audit-log.ts
import { prisma } from '../database/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('audit-log');

export interface AuditLogEntry {
    userId?: string;
    action: string;
    resource: string;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Immutable audit logging for all AI recommendations and sensitive actions
 */
export async function logAction(entry: AuditLogEntry): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: entry.userId,
                action: entry.action,
                resource: entry.resource,
                details: entry.details,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
            },
        });

        if (logger.level === 'debug' || process.env.GUARDRAIL_LOG_LEVEL === 'verbose') {
            logger.info('Audit log entry created', entry);
        }
    } catch (error) {
        logger.error('Failed to create audit log', { error, entry });
        // Don't throw - we don't want audit failures to break the system
    }
}

/**
 * Specialized logging for AI recommendations
 */
export async function logAIRecommendation(
    userId: string | undefined,
    type: string,
    input: Record<string, any>,
    output: Record<string, any>
): Promise<void> {
    await logAction({
        userId,
        action: 'AI_RECOMMENDATION',
        resource: `ai:${type}`,
        details: {
            type,
            input,
            output,
            wasAdvisoryFlagEnforced: true, // Always true
        },
    });
}

/**
 * Log data access attempts
 */
export async function logDataAccess(
    accessorId: string,
    targetUserId: string,
    dataType: string,
    granted: boolean
): Promise<void> {
    await logAction({
        userId: accessorId,
        action: 'DATA_ACCESS',
        resource: `user:${targetUserId}:${dataType}`,
        details: {
            accessorId,
            targetUserId,
            dataType,
            granted,
        },
    });
}
