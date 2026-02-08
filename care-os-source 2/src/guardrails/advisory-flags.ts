// src/guardrails/advisory-flags.ts
import { AIInsightResponse } from '../types/index.js';

/**
 * Middleware that ensures ALL AI-generated responses are flagged as "Advisory Only"
 * This is hard-coded and cannot be bypassed
 */
export function enforceAdvisoryFlag<T extends AIInsightResponse>(insights: T): T {
    // Force the advisory flag to true
    return {
        ...insights,
        metadata: {
            ...insights.metadata,
            isAdvisoryOnly: true, // ALWAYS true, cannot be overridden
        },
    };
}

/**
 * Generate UI badge text for messaging platforms
 */
export function getAdvisoryBadge(): string {
    return '⚠️ Advisory Only - Human Decision Required';
}

/**
 * Generate advisory disclaimer text
 */
export function getAdvisoryDisclaimer(): string {
    return (
        'This analysis is provided for advisory purposes only. ' +
        'All insights must be reviewed and validated by authorized personnel ' +
        'before any action is taken. CARE OS does not make decisions—humans do.'
    );
}
