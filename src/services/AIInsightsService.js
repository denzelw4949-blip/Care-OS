import OpenAI from 'openai';
import config from '../config/index.js';
import db from '../database/db.js';
import CheckIn from '../models/CheckIn.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

/**
 * AI Insights Service
 * Provides advisory-only analysis and recommendations
 * ETHICAL CONSTRAINTS:
 * - Advisory only, no disciplinary recommendations
 * - All outputs flagged as requiring human review
 * - No ranking, grading, or scoring of employees
 */
export class AIInsightsService {
    constructor() {
        if (config.ai.provider === 'openai') {
            this.client = new OpenAI({
                apiKey: config.ai.openai.apiKey,
            });
            this.model = config.ai.openai.model;
        }
        // Add Gemini support if needed
    }

    /**
     * Generate team wellbeing insights for a manager
     */
    async generateTeamWellbeingInsights(managerId) {
        // Get team check-ins
        const teamCheckIns = await CheckIn.getTeamCheckIns(managerId);

        if (teamCheckIns.length === 0) {
            return {
                insight: 'No team check-in data available yet.',
                advisoryOnly: true,
                requiresHumanReview: true,
            };
        }

        // Calculate aggregated metrics
        const metrics = {
            avgEnergy: teamCheckIns.reduce((sum, c) => sum + c.energy_level, 0) / teamCheckIns.length,
            avgStress: teamCheckIns.reduce((sum, c) => sum + c.stress_level, 0) / teamCheckIns.length,
            avgWorkload: teamCheckIns.reduce((sum, c) => sum + c.workload_level, 0) / teamCheckIns.length,
            totalResponses: teamCheckIns.length,
        };

        // Create ethical prompt
        const prompt = `You are a supportive wellbeing advisor for a team manager. 
    
Based on today's team check-in data:
- Average energy: ${metrics.avgEnergy.toFixed(1)}/10
- Average stress: ${metrics.avgStress.toFixed(1)}/10
- Average workload: ${metrics.avgWorkload.toFixed(1)}/10
- Responses: ${metrics.totalResponses} team members

Provide brief, supportive advice for the manager. Focus on:
1. General team wellness observations
2. Suggested supportive actions (e.g., team check-in, break reminder)
3. Positive reinforcement

CRITICAL CONSTRAINTS:
- DO NOT recommend any disciplinary action
- DO NOT rank or grade individuals
- DO NOT suggest performance reviews
- Keep advice supportive and human-centered
- Limit to 3-4 sentences

Response:`;

        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 150,
                temperature: 0.7,
            });

            const content = completion.choices[0].message.content;

            // Save insight to database
            const savedInsight = await this.saveInsight({
                insightType: 'team_wellbeing',
                targetRole: 'manager',
                content,
                dataSource: { metrics, teamSize: teamCheckIns.length },
            });

            return {
                ...savedInsight,
                advisoryOnly: true,
                requiresHumanReview: true,
                disclaimer: 'This is advisory information only. Use your judgment for appropriate action.',
            };
        } catch (error) {
            console.error('AI insight generation error:', error);
            throw new Error('Failed to generate insights');
        }
    }

    /**
     * Generate individual support suggestions
     */
    async generateIndividualSupportSuggestions(userId, managerId) {
        // Get user's recent check-ins
        const checkIns = await CheckIn.getRecentForAnalysis(userId, 7);
        const user = await User.findById(userId);

        if (checkIns.length < 2) {
            return {
                insight: 'Insufficient data for personalized suggestions.',
                advisoryOnly: true,
                requiresHumanReview: true,
            };
        }

        // Check privacy settings
        const privacySettings = await User.getPrivacySettings(userId);
        if (!privacySettings?.allow_ai_analysis) {
            return {
                insight: 'Team member has opted out of AI analysis.',
                advisoryOnly: true,
                requiresHumanReview: true,
            };
        }

        const avgMetrics = {
            energy: checkIns.reduce((sum, c) => sum + c.energy_level, 0) / checkIns.length,
            stress: checkIns.reduce((sum, c) => sum + c.stress_level, 0) / checkIns.length,
            workload: checkIns.reduce((sum, c) => sum + c.workload_level, 0) / checkIns.length,
        };

        const prompt = `You are a supportive wellbeing advisor. A team member's recent average check-ins show:
- Energy: ${avgMetrics.energy.toFixed(1)}/10
- Stress: ${avgMetrics.stress.toFixed(1)}/10
- Workload: ${avgMetrics.workload.toFixed(1)}/10

Suggest 2-3 brief, supportive conversation topics or actions for their manager to consider.

CRITICAL CONSTRAINTS:
- DO NOT recommend discipline or performance reviews
- Focus on support, not criticism
- Suggest checking in, offering resources, or adjusting workload
- Keep suggestions compassionate and constructive
- Limit to 2-3 sentences

Suggestions:`;

        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 120,
                temperature: 0.7,
            });

            const content = completion.choices[0].message.content;

            const savedInsight = await this.saveInsight({
                insightType: 'individual_support',
                targetRole: 'manager',
                content: `Regarding ${user.display_name || 'team member'}: ${content}`,
                dataSource: { userId, metrics: avgMetrics },
            });

            return {
                ...savedInsight,
                advisoryOnly: true,
                requiresHumanReview: true,
                disclaimer: 'Advisory only. Please use your judgment and respect privacy.',
            };
        } catch (error) {
            console.error('AI insight generation error:', error);
            throw new Error('Failed to generate insights');
        }
    }

    /**
     * Save insight to database
     */
    async saveInsight(insightData) {
        const result = await db.query(
            `INSERT INTO ai_insights (
        insight_type, target_role, content, data_source, advisory_flag
      ) VALUES ($1, $2, $3, $4, true)
      RETURNING *`,
            [
                insightData.insightType,
                insightData.targetRole,
                insightData.content,
                JSON.stringify(insightData.dataSource),
            ]
        );

        return result.rows[0];
    }

    /**
     * Get insights for a role
     */
    async getInsightsForRole(role, limit = 10) {
        const result = await db.query(
            `SELECT * FROM ai_insights
       WHERE target_role = $1
       ORDER BY created_at DESC
       LIMIT $2`,
            [role, limit]
        );

        return result.rows.map(insight => ({
            ...insight,
            advisoryOnly: true,
            requiresHumanReview: !insight.human_reviewed,
            disclaimer: 'This is advisory information only.',
        }));
    }

    /**
     * Mark insight as reviewed by human
     */
    async markAsReviewed(insightId, reviewerId, actionTaken = null) {
        const result = await db.query(
            `UPDATE ai_insights
       SET human_reviewed = true,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           action_taken = $3
       WHERE id = $1
       RETURNING *`,
            [insightId, reviewerId, actionTaken]
        );

        return result.rows[0];
    }
}

// Export singleton instance
export default new AIInsightsService();
