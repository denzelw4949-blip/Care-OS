// src/modules/insights/analyzer.ts
import { AIInsightRequest, AIInsightResponse } from '../../types/index.js';
import { prisma } from '../../database/index.js';
import { blockDisciplinaryIntent, filterAIResponse } from '../../guardrails/anti-disciplinary.js';
import { enforceAdvisoryFlag } from '../../guardrails/advisory-flags.js';
import { logAIRecommendation } from '../../guardrails/audit-log.js';
import { createLogger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

const logger = createLogger('insights-analyzer');

/**
 * Generate AI-assisted insights with strict ethical guardrails
 */
export async function generateInsights(request: AIInsightRequest): Promise<AIInsightResponse> {
    logger.info('Generating insights', { type: request.type, timeRange: request.timeRange });

    // GUARDRAIL CHECK: Block any disciplinary intent in the request
    if (config.enableGuardrails) {
        blockDisciplinaryIntent(JSON.stringify(request));
    }

    try {
        // Fetch relevant data based on request type
        const data = await fetchInsightData(request);

        // Generate insights (placeholder - integrate with AI provider)
        const rawInsights = await generateAIInsights(data, request.type);

        // GUARDRAIL: Filter AI response for prohibited content
        if (config.enableGuardrails) {
            rawInsights.forEach(insight => filterAIResponse(insight));
        }

        const response: AIInsightResponse = {
            insights: rawInsights,
            recommendations: [
                'Consider scheduling 1:1 check-ins with team members showing consistent workload stress',
                'Review team capacity and consider redistributing tasks if workload patterns persist',
                'Encourage use of wellbeing resources and ensure team is aware of support available',
            ],
            metadata: {
                isAdvisoryOnly: true,
                generatedAt: new Date(),
                dataPoints: data.length,
            },
        };

        // GUARDRAIL: Enforce advisory-only flag (cannot be bypassed)
        const flaggedResponse = enforceAdvisoryFlag(response);

        // AUDIT: Log this AI recommendation
        await logAIRecommendation(
            request.userId,
            request.type,
            { timeRange: request.timeRange },
            { insightCount: flaggedResponse.insights.length }
        );

        return flaggedResponse;
    } catch (error) {
        logger.error('Failed to generate insights', { error });
        throw error;
    }
}

async function fetchInsightData(request: AIInsightRequest) {
    const { start, end } = request.timeRange;

    const checkins = await prisma.checkIn.findMany({
        where: {
            timestamp: {
                gte: start,
                lte: end,
            },
            ...(request.userId && { userId: request.userId }),
        },
        include: {
            user: {
                select: {
                    id: true,
                    role: true,
                    managerId: true,
                },
            },
        },
    });

    return checkins;
}

/**
 * PLACEHOLDER: Integrate with actual AI provider (OpenAI, Gemini, etc.)
 */
async function generateAIInsights(data: any[], type: string): Promise<string[]> {
    // TODO: Integrate with OpenAI/Gemini
    // For now, return basic statistical insights

    if (data.length === 0) {
        return ['Insufficient data for meaningful insights in this time period.'];
    }

    const avgMood = data.reduce((sum, d) => sum + d.moodScore, 0) / data.length;
    const avgWorkload = data.reduce((sum, d) => sum + d.workloadLevel, 0) / data.length;

    const insights: string[] = [];

    if (avgMood < 5) {
        insights.push(
            `Team mood scores are below average (${avgMood.toFixed(1)}/10). ` +
            `Consider checking in with individual team members to understand concerns.`
        );
    }

    if (avgWorkload > 7) {
        insights.push(
            `Team reporting high workload levels (${avgWorkload.toFixed(1)}/10). ` +
            `Review capacity and consider workload distribution adjustments.`
        );
    }

    if (insights.length === 0) {
        insights.push(
            `Team wellbeing metrics are within normal range. ` +
            `Mood: ${avgMood.toFixed(1)}/10, Workload: ${avgWorkload.toFixed(1)}/10.`
        );
    }

    return insights;
}
