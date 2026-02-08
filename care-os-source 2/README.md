# CARE OS - Headless Integration System

**A human-centered wellbeing and task management system designed for seamless integration with enterprise messaging platforms (Slack, Microsoft Teams).**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Overview

CARE OS is an API-first, headless system that integrates directly with where employees already work. It prioritizes human wellbeing alongside task management while adhering to strict ethical AI guardrails.

### Key Features

- **Daily Human-State Check-Ins**: Multi-step conversational flows with privacy controls
- **Role-Based Access Control**: Employee, Manager, Executive, and CARE Consultant roles
- **Task Management**: Role-specific task assignment and tracking
- **Peer Recognition**: Culture-building recognition system
- **Deviation Detection**: Advisory-only alerts for manager awareness
- **AI Insights**: Supportive suggestions with hard-coded ethical constraints
- **Stateless Architecture**: Redis-backed session management for seamless interactions

### Ethical Guardrails 🛡️

CARE OS is built with ethics at its core:

- ✅ **Anti-Disciplinary Logic**: Hard-coded blocks on disciplinary recommendations
- ✅ **Advisory-Only AI**: All AI outputs flagged as requiring human review
- ✅ **Data Sovereignty**: Employee-controlled privacy settings
- ✅ **No Ranking/Grading**: Prohibited at both code and database levels

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Enterprise Platforms                     │
│         (Slack, Microsoft Teams, etc.)                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Webhooks / API Calls
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                  CARE OS Core API                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Authentication & RBAC Middleware                  │    │
│  │  Ethical Guardrails Enforcement                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Check-In │  │  Tasks   │  │   Recog- │  │Deviation │  │
│  │ Service  │  │ Service  │  │   nition │  │ Detection│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           AI Insights Service                      │    │
│  │  (OpenAI/Gemini with Ethical Prompting)           │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────┬──────────────────┬──────────────────────┘
                   │                  │
           ┌───────▼──────┐    ┌─────▼──────┐
           │  PostgreSQL  │    │   Redis    │
           │  (with RLS)  │    │  (State)   │
           └──────────────┘    └────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- Slack or Teams App credentials (see [Platform Setup Guide](docs/PLATFORM_SETUP.md))

### Installation

1. **Clone and install dependencies**:

```bash
cd /path/to/care-os
npm install
```

2. **Set up environment variables**:

```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Initialize the database**:

```bash
# Create database
createdb care_os

# Run schema migration
psql -d care_os -f src/database/schema.sql
```

4. **Start Redis** (if not running):

```bash
redis-server
```

5. **Start the server**:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

---

## 📋 API Endpoints

### Authentication

All API endpoints (except `/health`) require JWT authentication:

```
Authorization: Bearer <JWT_TOKEN>
```

### Check-Ins

- `POST /api/checkins` - Submit daily check-in
- `GET /api/checkins/:userId` - Get user's check-ins (privacy-aware)
- `GET /api/checkins/team/today` - Manager view of team check-ins
- `PUT /api/checkins/:id/privacy` - Update privacy settings

### Tasks

- `POST /api/tasks` - Create task
- `GET /api/tasks` - Get tasks (filtered by permissions)
- `GET /api/tasks/team` - Manager view of team tasks
- `PUT /api/tasks/:id` - Update task
- `PUT /api/tasks/:id/complete` - Mark complete

### Recognitions

- `POST /api/recognitions` - Send recognition
- `GET /api/recognitions` - Get recognitions
- `GET /api/recognitions/team` - Manager view of team recognitions

### Deviation Alerts (Manager Only)

- `GET /api/deviations` - Get deviation alerts
- `POST /api/deviations/:id/acknowledge` - Acknowledge alert
- `GET /api/deviations/statistics` - Get alert statistics

### AI Insights (Manager/Executive/Consultant)

- `POST /api/insights/team-wellbeing` - Generate team insights
- `POST /api/insights/individual-support` - Generate support suggestions
- `GET /api/insights` - Get insights for role
- `POST /api/insights/:id/review` - Mark as reviewed

---

## 🔌 Platform Integrations

### Slack

**Slash Commands**:
- `/checkin` - Start daily check-in
- `/tasks` - View your tasks
- `/recognize` - Recognize a teammate

**App Home**: Interactive dashboard with quick actions

See [Slack Setup Guide](docs/PLATFORM_SETUP.md#slack-setup)

### Microsoft Teams (Coming Soon)

Adaptive Card-based interactions with proactive messaging.

---

## 🔒 Security & Privacy

### Row-Level Security (PostgreSQL)

Database enforces privacy settings at the query level:

```sql
-- Users can only see check-ins based on visibility settings
CREATE POLICY checkin_manager_policy ON human_state_checkins
  FOR SELECT USING (
    visibility IN ('manager_only', 'public')
    AND user_id IN (SELECT id FROM users WHERE manager_id = current_user_id)
  );
```

### Data Sovereignty

Employees control who sees their data through privacy settings:

- **Private**: Only the employee
- **Manager Only**: Employee and their manager
- **Public**: Visible to team

### Ethical AI Constraints

Content scanning blocks prohibited patterns:

```javascript
const PROHIBITED_PATTERNS = [
  /\b(fire|terminate|punish|discipline)\b/i,
  /\b(rank|grade|score)\s+employee/i,
  // ... more patterns
];
```

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run ethical guardrail tests
npm run test:guardrails
```

---

## 📖 Documentation

- [Platform Setup Guide](docs/PLATFORM_SETUP.md) - Set up Slack/Teams apps
- [Ethical Guardrails](docs/ETHICAL_GUARDRAILS.md) - How ethics are enforced
- [API Documentation](docs/API.md) - Full API reference (generated from routes)
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment

---

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. All AI features include ethical guardrails
2. Privacy settings are respected
3. Tests pass (`npm run test:guardrails`)

---

## 📜 License

MIT License - see LICENSE file for details

---

## 💙 Philosophy

CARE OS is built on the belief that technology should support human flourishing, not surveillance. Every design decision prioritizes:

1. **Employee agency** over managerial control
2. **Support** over discipline
3. **Privacy** over transparency
4. **Human judgment** over automated decisions

---

## 📧 Support

For questions or issues, please open a GitHub issue or contact the maintainers.

---

Built with 💙 for human-centered workplaces.
