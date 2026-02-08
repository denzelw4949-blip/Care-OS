# Ethical Guardrails Documentation

## Overview

CARE OS implements multiple layers of ethical constraints to ensure the system **never** recommends disciplinary action, ranks employees, or violates individual privacy. These guardrails are enforced at the **code level**, **database level**, and **AI prompt level**.

---

## Core Principles

1. **Advisory Only**: All AI-generated insights must be flagged as requiring human review
2. **Anti-Disciplinary**: No suggestions for punishment, termination, or corrective action
3. **No Ranking**: No employee grading, scoring, or leaderboards
4. **Data Sovereignty**: Employees control who can access their wellbeing data
5. **Human-in-the-Loop**: All significant actions require human decision-making

---

## Implementation Layers

### 1. Database-Level Constraints

**Advisory Flag Enforcement**:

```sql
CREATE TABLE ai_insights (
  ...
  advisory_flag BOOLEAN DEFAULT true,
  ...
  -- Hard constraint: advisory_flag MUST be true
  CHECK (advisory_flag = true)
);
```

This ensures that even if application code is modified, the database will reject non-advisory AI insights.

**Row-Level Security Policies**:

Privacy settings are enforced at the database query level:

```sql
CREATE POLICY checkin_owner_policy ON human_state_checkins
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::UUID);
```

### 2. Middleware-Level Enforcement

**Content Scanning**:

[`src/middleware/ethicalGuardrails.js`](file:///Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma/src/middleware/ethicalGuardrails.js)

```javascript
const PROHIBITED_PATTERNS = [
  /\b(fire|terminate|punish|penalize|discipline)\b/i,
  /\b(rank|grade|score|rate)\s+(employee|worker)\b/i,
  /\b(poor|bad|inadequate)\s+performance\b/i,
  /\b(warning|reprimand|corrective action)\b/i,
  /\bperformance review\b/i,
];
```

Any AI output matching these patterns is **blocked** before reaching the user.

**Advisory Flag Injection**:

```javascript
export const enforceAdvisoryOnly = (req, res, next) => {
  if (req.body && (req.body.insightType || req.body.recommendation)) {
    req.body.advisoryFlag = true;
    req.body.humanReviewed = false;
  }
  next();
};
```

### 3. AI Prompt Engineering

**System-Level Constraints**:

[`src/services/AIInsightsService.js`](file:///Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma/src/services/AIInsightsService.js)

Every AI prompt includes explicit ethical instructions:

```javascript
const prompt = `You are a supportive wellbeing advisor.

CRITICAL CONSTRAINTS:
- DO NOT recommend any disciplinary action
- DO NOT rank or grade individuals
- DO NOT suggest performance reviews
- Keep advice supportive and human-centered
- Focus on support, not criticism
...`;
```

### 4. Service-Level Logic

**Deviation Detection**:

[`src/services/DeviationDetectionService.js`](file:///Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma/src/services/DeviationDetectionService.js)

Even when detecting significant changes in check-in patterns, the language is always supportive:

```javascript
const description = `Check-in pattern shift detected for ${user.display_name}. ` +
  `Consider having a supportive conversation.`;
// NOT: "Employee showing poor performance"
```

All deviation alerts include:

```javascript
return result.rows.map(alert => ({
  ...alert,
  advisoryOnly: true,
  requiresHumanReview: true,
  disclaimer: 'This alert is for awareness only. Please use your judgment for appropriate supportive action.',
}));
```

---

## Audit Logging

All AI interactions are logged for compliance review:

```javascript
export const logAIInteraction = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = (data) => {
    if (data.insight || data.recommendation) {
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
```

Logs include:
- Timestamp
- Requesting user and role
- Whether advisory flag is present
- Content summary

---

## Privacy Enforcement

### Employee-Controlled Visibility

Check-ins, tasks, and recognitions support three privacy levels:

- **Private**: Only the employee can see
- **Manager Only**: Employee and their direct manager
- **Public**: Visible to the team

Privacy is respected at the query level:

```javascript
if (userId !== requesterId) {
  if (requesterRole === 'employee') {
    query += ` AND visibility = 'public'`;
  } else if (requesterRole === 'manager') {
    query += ` AND visibility IN ('manager_only', 'public')`;
  }
}
```

### Opt-Out of AI Analysis

Users can disable AI analysis of their data:

```sql
CREATE TABLE privacy_settings (
  ...
  allow_ai_analysis BOOLEAN DEFAULT true,
  ...
);
```

Checked before generating insights:

```javascript
const privacySettings = await User.getPrivacySettings(userId);
if (!privacySettings?.allow_ai_analysis) {
  return {
    insight: 'Team member has opted out of AI analysis.',
    advisoryOnly: true,
  };
}
```

---

## Testing Ethical Guardrails

### Prohibited Content Detection

**Test Case**: Attempt to submit disciplinary language

```javascript
const content = "This employee should be terminated for poor performance";
const result = scanForProhibitedContent(content);

assert(result.isClean === false);
assert(result.violations.length > 0);
```

### Advisory Flag Enforcement

**Test Case**: Attempt to create AI insight without advisory flag

```sql
-- This will FAIL
INSERT INTO ai_insights (content, advisory_flag)
VALUES ('Some insight', false);

-- Error: new row violates check constraint "ai_insights_advisory_flag_check"
```

### Privacy Violation Attempts

**Test Case**: Employee tries to access another's private check-in

```javascript
const checkIns = await CheckIn.getByUserId(
  otherUserId,
  employeeId,
  'employee',
  10
);

// Result: Empty array (privacy enforced)
assert(checkIns.length === 0);
```

---

## Configuration

Ethical guardrails can be configured via environment variables:

```env
# Enable/disable guardrails (should ALWAYS be true in production)
ENABLE_GUARDRAILS=true

# Logging verbosity for audits
GUARDRAIL_LOG_LEVEL=verbose
```

⚠️ **WARNING**: Disabling guardrails is **not recommended** and should only be done in isolated development environments for testing purposes.

---

## Handling Violations

When a violation is detected:

1. **Content is blocked** from reaching the user
2. **Error is logged** with violation details
3. **User receives generic error** (no sensitive details exposed)
4. **Audit log is created** for compliance review

Example response:

```json
{
  "error": "Content Violation",
  "message": "Response blocked by ethical guardrails",
  "details": "Content contains prohibited disciplinary language"
}
```

---

## Future Enhancements

1. **ML-Based Pattern Detection**: Train a model to detect subtle disciplinary language
2. **External Audit API**: Allow third-party ethics auditors to review logs
3. **User-Reported Violations**: Enable employees to flag concerning AI outputs
4. **Quarterly Ethics Reviews**: Automated reports for compliance teams

---

## Philosophy

> "Technology should amplify human compassion, not automate judgment."

Every line of code in CARE OS is written with this principle in mind. The ethical guardrails are not optional features—they are the **foundation** of the system.

---

## Contact

For questions about ethical implementation:
- Review the source code in [`src/middleware/ethicalGuardrails.js`](file:///Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma/src/middleware/ethicalGuardrails.js)
- Check the database schema constraints in [`src/database/schema.sql`](file:///Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma/src/database/schema.sql)
- Open an issue for discussion
