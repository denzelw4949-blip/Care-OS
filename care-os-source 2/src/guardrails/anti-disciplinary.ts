// src/guardrails/anti-disciplinary.ts
import { createLogger } from '../utils/logger.js';

const logger = createLogger('anti-disciplinary');

// Prohib ited keywords and patterns that indicate disciplinary intent
const DISCIPLINARY_KEYWORDS = [
    'discipline',
    'punish',
    'terminate',
    'fire',
    'demote',
    'penalize',
    'sanction',
    'reprimand',
    'write-up',
    'write up',
    'performance improvement plan',
    'pip',
    'rank employees',
    'rank workers',
    'worst performer',
    'best performer',
    'bottom 10%',
    'top 10%',
    'grade employees',
    'score employees',
    'compare employees',
    'employee rankings',
    'performance score',
    'stack rank',
];

const COMPETITIVE_PATTERNS = [
    /rank.*employees?/i,
    /grade.*employees?/i,
    /score.*employees?/i,
    /worst.*performer/i,
    /best.*performer/i,
    /top\s+\d+%?/i,
    /bottom\s+\d+%?/i,
    /compare.*employees?/i,
    /leaderboard/i,
];

/**
 * Strict enforcement: Blocks any request that attempts disciplinary or competitive ranking
 */
export function blockDisciplinaryIntent(input: string): void {
    const lowerInput = input.toLowerCase();

    // Check for prohibited keywords
    for (const keyword of DISCIPLINARY_KEYWORDS) {
        if (lowerInput.includes(keyword.toLowerCase())) {
            logger.warn('Blocked disciplinary intent', { keyword, input: input.substring(0, 100) });
            throw new GuardrailViolationError(
                `GUARDRAIL VIOLATION: This system cannot ${keyword} employees or make disciplinary recommendations. ` +
                `All AI outputs are advisory only and focused on wellbeing support.`
            );
        }
    }

    // Check for competitive/ranking patterns
    for (const pattern of COMPETITIVE_PATTERNS) {
        if (pattern.test(input)) {
            logger.warn('Blocked competitive ranking intent', { pattern: pattern.source, input: input.substring(0, 100) });
            throw new GuardrailViolationError(
                `GUARDRAIL VIOLATION: This system does not rank, grade, or compare employees competitively. ` +
                `CARE OS is designed to support wellbeing, not performance evaluation.`
            );
        }
    }
}

/**
 * Content filter for AI-generated responses
 */
export function filterAIResponse(response: string): string {
    const lowerResponse = response.toLowerCase();

    // Check if AI response contains disciplinary language
    for (const keyword of DISCIPLINARY_KEYWORDS) {
        if (lowerResponse.includes(keyword.toLowerCase())) {
            logger.error('AI response contained disciplinary content - blocking', { response: response.substring(0, 100) });
            throw new GuardrailViolationError(
                `GUARDRAIL VIOLATION: AI generated content that violates anti-disciplinary policy. Response blocked.`
            );
        }
    }

    return response;
}

export class GuardrailViolationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GuardrailViolationError';
    }
}
