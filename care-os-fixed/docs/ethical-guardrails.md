# CARE OS Ethical Guardrails

This document explains the ethical constraints enforced by CARE OS to ensure the system prioritizes human wellbeing and cannot be used for punitive or competitive purposes.

## Core Principles

1. **Human-Centered**: The system exists to support employee wellbeing, not to manage performance
2. **Non-Punitive**: CARE OS cannot and will not discipline, rank, or grade employees
3. **Transparency**: All AI recommendations are logged and visible
4. **Employee Sovereignty**: Individuals control their own data

---

## 1. Anti-Disciplinary Logic

### What It Does

The anti-disciplinary guardrail **blocks any attempt** to use CARE OS for:
- Disciplining employees
- Ranking or grading employees
- Comparing employees competitively
- Generating performance improvement plans
- Creating "worst performer" lists

### How It Works

**Input Validation**: All requests are scanned for prohibited keywords and patterns:

```typescript
// Blocked keywords
'discipline', 'punish', 'terminate', 'fire', 'demote', 
'rank employees', 'worst performer', 'stack rank', etc.

// Blocked patterns
/rank.*employees/i
/grade.*employees/i
/bottom \d+%/i
```

**Output Filtering**: AI-generated responses are scanned for the same patterns. If detected, the response is blocked entirely.

**Result**: Any attempt to violate this guardrail throws a `GuardrailViolationError` and is logged.

### Example

```javascript
// ❌ This will fail
POST /api/insights
{ type: "rank worst performers" }

// Response: 403 Forbidden
{
  "error": "GUARDRAIL VIOLATION: This system does not rank employees"
}
```

---

## 2. Advisory-Only Status

### What It Does

**Every single AI-generated output** is hard-coded as "Advisory Only" and requires human review before action.

### How It Works

All AI insights include this metadata:

```typescript
{
  insights: [...],
  recommendations: [...],
  metadata: {
    isAdvisoryOnly: true,  // ALWAYS true, cannot be bypassed
    generatedAt: Date,
    dataPoints: number
  }
}
```

### UI Enforcement

All messaging platform cards displaying AI insights include:
- Badge: `⚠️ Advisory Only - Human Decision Required`
- Disclaimer text explaining that humans must review and approve

### Example

When a manager receives an AI insight:

```
⚠️ Advisory Only - Human Decision Required

Insight: Team workload levels elevated (7.8/10 avg)

Recommendation: Review capacity and redistribute tasks

---
This analysis is advisory only. All insights must be reviewed 
by authorized personnel before action is taken.
```

---

## 3. Data Sovereignty

### What It Does

Employees have **granular control** over who can see their wellbeing data.

### Visibility Levels

| Level | Who Can See |
|-------|------------|
| **PRIVATE** | Employee only |
| **MANAGER** | Employee + direct manager |
| **PUBLIC** | All authorized roles (Executives, CARE Consultants) |

### How It Works

Every check-in includes a `visibility` field:

```typescript
const checkin = await prisma.checkIn.create({
  data: {
    userId: user.id,
    moodScore: 7,
    workloadLevel: 6,
    visibility: CheckInVisibility.MANAGER  // Employee's choice
  }
});
```

Before returning check-in data, the system checks permissions:

```typescript
function checkDataVisibility(checkin, accessor, targetUser) {
  // Owner always sees own data
  if (accessor.id === checkin.userId) return true;
  
  // Executives/consultants see MANAGER and PUBLIC
  if (accessor.role === 'EXECUTIVE' && checkin.visibility !== 'PRIVATE') 
    return true;
  
  // Managers see MANAGER/PUBLIC for their direct reports
  if (accessor.role === 'MANAGER' && targetUser.managerId === accessor.id)
    return checkin.visibility !== 'PRIVATE';
  
  // PUBLIC visible to all
  return checkin.visibility === 'PUBLIC';
}
```

**Result**: Unauthorized access attempts return `403 Forbidden`.

---

## 4. Audit Logging

### What It Does

Creates an **immutable record** of all:
- AI recommendations
- Data access attempts
- Role changes
- Sensitive actions

### Log Structure

```typescript
await prisma.auditLog.create({
  data: {
    userId: "user-123",
    action: "AI_RECOMMENDATION",
    resource: "ai:team_wellbeing",
    details: {
      type: "team_wellbeing",
      input: { timeRange: ... },
      output: { insightCount: 3 },
      wasAdvisoryFlagEnforced: true
    },
    timestamp: new Date(),
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0..."
  }
});
```

### Guarantees

- **Append-only**: Logs cannot be modified or deleted
- **Complete**: Every AI interaction is logged
- **Timestamped**: Precise audit trail
- **Detailed**: Includes input, output, and metadata

### Access

- Executives can query audit logs via API
- Logs can be exported for compliance reviews
- Retention: Configurable (default: 1 year)

---

## Compliance

### GDPR

- **Right to Access**: Employees can download their complete data
- **Right to Erasure**: User deletion removes all PII (audit logs anonymized)
- **Data Minimization**: Only essential wellbeing data collected

### CCPA

- **Transparency**: Privacy policy explains data usage
- **Opt-Out**: Employees can set visibility to PRIVATE

### HIPAA

CARE OS does **not** collect protected health information (PHI). Mood scores are self-reported and not medical diagnoses.

If integrating with health systems, additional safeguards required.

---

## Testing Guardrails

Run the guardrail test suite:

```bash
npm run test:guardrails
```

Tests verify:
- ✅ Disciplinary keywords are blocked
- ✅ AI outputs include advisory flags
- ✅ Unauthorized data access is denied
- ✅ All AI recommendations are logged

---

## Emergency Override

**There is NO override mechanism.**

By design, these guardrails cannot be bypassed—even by administrators. This is intentional to prevent misuse.

If a legitimate use case requires bypassing a guardrail, the code must be modified and redeployed (creating an audit trail via version control).

---

## Contact

For questions about ethical guardrails or compliance, contact your system administrator.
