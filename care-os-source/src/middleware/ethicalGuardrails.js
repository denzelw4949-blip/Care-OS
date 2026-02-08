/**
 * Ethical Guardrails Middleware
 * Enforces anti-disciplinary logic and advisory-only constraints
 */

// Prohibited patterns that indicate disciplinary/ranking/grading language
const PROHIBITED_PATTERNS = [
    /\b(fire|terminate|punish|penalize|discipline)\b/i,
    /\b(rank|grade|score|rate)\s+(employee|worker|person|individual)s?\b/i,
    /\b(poor|bad|inadequate)\s+performance\b/i,
    /\b(warning|reprimand|corrective action)\b/i,
    /\b(top|bottom)\s+performer/i,
    /\bleaderboard\b/i,
    /\bperformance review\b/i, // Unless explicitly requested
];

// Required flags for AI outputs
const REQUIRED_FLAGS = {
    advisoryOnly: true,
    requiresHumanReview: true,
};

/**
 * Scan content for prohibited disciplinary language
 * @param {string} content - Content to scan
 * @returns {Object} Validation result
 */
export const scanForProhibitedContent = (content) => {
    const violations = [];

    for (const pattern of PROHIBITED_PATTERNS) {
        if (pattern.test(content)) {
            violations.push({
                pattern: pattern.toString(),
                matched: content.match(pattern)?.[0],
            });
        }
    }

    return {
        isClean: violations.length === 0,
        violations,
    };
};

/**
 * Middleware to validate AI-generated responses
 */
export const validateAIResponse = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (data) => {
        // Check if this is an AI-generated insight
        if (data.insight || data.recommendation || data.analysis) {
            const content = JSON.stringify(data);
            const scanResult = scanForProhibitedContent(content);

            if (!scanResult.isClean) {
                console.error('Ethical guardrail violation detected:', scanResult.violations);

                return originalJson({
                    error: 'Content Violation',
                    message: 'Response blocked by ethical guardrails',
                    details: 'Content contains prohibited disciplinary language',
                    violations: scanResult.violations,
                });
            }

            // Ensure advisory-only flags are present
            if (!data.advisoryOnly) {
                data.advisoryOnly = true;
                data.requiresHumanReview = true;
                data.disclaimer = 'This is advisory information only. Human review and decision-making required.';
            }
        }

        return originalJson(data);
    };

    next();
};

/**
 * Enforce advisory-only flag on all AI insights
 */
export const enforceAdvisoryOnly = (req, res, next) => {
    // Modify request body if creating an AI insight
    if (req.body && (req.body.insightType || req.body.recommendation)) {
        req.body.advisoryFlag = true;
        req.body.humanReviewed = false;
    }

    next();
};

/**
 * Block disciplinary actions in data writes
 */
export const blockDisciplinaryActions = (req, res, next) => {
    const bodyContent = JSON.stringify(req.body || {});
    const scanResult = scanForProhibitedContent(bodyContent);

    if (!scanResult.isClean) {
        return res.status(400).json({
            error: 'Policy Violation',
            message: 'Action blocked by ethical guardrails',
            details: 'Request contains prohibited disciplinary language or intent',
            violations: scanResult.violations,
        });
    }

    next();
};

/**
 * Log all AI-generated content for audit purposes
 */
export const logAIInteraction = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (data) => {
        if (data.insight || data.recommendation || data.analysis) {
            console.log('[ETHICAL GUARDRAIL AUDIT]', {
                timestamp: new Date().toISOString(),
                endpoint: req.path,
                user: req.user?.userId,
                role: req.user?.role,
                advisoryOnly: data.advisoryOnly,
                contentSummary: JSON.stringify(data).substring(0, 200),
            });
        }

        return originalJson(data);
    };

    next();
};

export default {
    validateAIResponse,
    enforceAdvisoryOnly,
    blockDisciplinaryActions,
    logAIInteraction,
    scanForProhibitedContent,
};
