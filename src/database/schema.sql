-- CARE OS Database Schema
-- Headless Integration System for Enterprise Messaging Platforms

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for user roles
CREATE TYPE user_role AS ENUM ('employee', 'manager', 'executive', 'consultant');

-- Enum for platform types
CREATE TYPE platform_type AS ENUM ('slack', 'teams');

-- Enum for privacy levels
CREATE TYPE privacy_level AS ENUM ('private', 'manager_only', 'public');

-- Enum for task status
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Users table with role-based access control
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_type platform_type NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    email VARCHAR(255),
    display_name VARCHAR(255),
    manager_id UUID REFERENCES users(id),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform_type, platform_user_id)
);

-- Index for faster lookups
CREATE INDEX idx_users_platform ON users(platform_type, platform_user_id);
CREATE INDEX idx_users_manager ON users(manager_id);

-- Privacy settings for data sovereignty
CREATE TABLE privacy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkin_visibility privacy_level DEFAULT 'manager_only',
    task_visibility privacy_level DEFAULT 'public',
    recognition_visibility privacy_level DEFAULT 'public',
    allow_ai_analysis BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Human-state check-ins with privacy controls
CREATE TABLE human_state_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
    stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
    workload_level INTEGER CHECK (workload_level BETWEEN 1 AND 10),
    mood VARCHAR(50),
    notes TEXT,
    visibility privacy_level DEFAULT 'manager_only',
    check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, check_in_date)
);

CREATE INDEX idx_checkins_user_date ON human_state_checkins(user_id, check_in_date DESC);
CREATE INDEX idx_checkins_date ON human_state_checkins(check_in_date DESC);

-- Tasks with role-based assignment
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'pending',
    priority INTEGER CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending', 'rejected')),
    requires_approval BOOLEAN DEFAULT false,
    completion_shared BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to, status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Peer-to-peer recognition
CREATE TABLE recognitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    category VARCHAR(100),
    visibility privacy_level DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (from_user_id != to_user_id)
);

CREATE INDEX idx_recognitions_to_user ON recognitions(to_user_id, created_at DESC);
CREATE INDEX idx_recognitions_from_user ON recognitions(from_user_id, created_at DESC);

-- Deviation detection alerts
CREATE TABLE deviation_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES users(id),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')),
    description TEXT NOT NULL,
    data_summary JSONB,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_manager ON deviation_alerts(manager_id, acknowledged, created_at DESC);
CREATE INDEX idx_alerts_user ON deviation_alerts(user_id, created_at DESC);

-- AI-generated insights (advisory only)
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insight_type VARCHAR(100) NOT NULL,
    target_role user_role NOT NULL,
    content TEXT NOT NULL,
    data_source JSONB,
    advisory_flag BOOLEAN DEFAULT true,
    human_reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    action_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Enforce advisory-only constraint at database level
    CHECK (advisory_flag = true)
);

CREATE INDEX idx_insights_role ON ai_insights(target_role, created_at DESC);
CREATE INDEX idx_insights_reviewed ON ai_insights(human_reviewed, created_at DESC);

-- Conversation state for stateless architecture (session management)
CREATE TABLE conversation_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform_type platform_type NOT NULL,
    conversation_id VARCHAR(255) NOT NULL,
    flow_type VARCHAR(100) NOT NULL,
    current_step VARCHAR(100),
    state_data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_states_user ON conversation_states(user_id, platform_type);
CREATE INDEX idx_conversation_states_expires ON conversation_states(expires_at);

-- Row-level security policies for data sovereignty

-- Enable RLS on sensitive tables
ALTER TABLE human_state_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deviation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Check-ins: Users can see their own, managers can see their reports' (respecting privacy)
CREATE POLICY checkin_owner_policy ON human_state_checkins
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY checkin_manager_policy ON human_state_checkins
    FOR SELECT
    USING (
        visibility IN ('manager_only', 'public')
        AND user_id IN (
            SELECT id FROM users WHERE manager_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Tasks: Users can see their assigned tasks, managers can see their reports' tasks
CREATE POLICY task_assigned_policy ON tasks
    FOR ALL
    USING (assigned_to = current_setting('app.current_user_id')::UUID);

CREATE POLICY task_manager_policy ON tasks
    FOR SELECT
    USING (
        assigned_to IN (
            SELECT id FROM users WHERE manager_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Deviation alerts: Only managers can see alerts for their reports
CREATE POLICY alert_manager_policy ON deviation_alerts
    FOR ALL
    USING (manager_id = current_setting('app.current_user_id')::UUID);

-- AI insights: Role-based access
CREATE POLICY insight_role_policy ON ai_insights
    FOR SELECT
    USING (
        target_role = (
            SELECT role FROM users WHERE id = current_setting('app.current_user_id')::UUID
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at BEFORE UPDATE ON privacy_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_states_updated_at BEFORE UPDATE ON conversation_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Default privacy settings trigger
CREATE OR REPLACE FUNCTION create_default_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO privacy_settings (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_privacy_settings AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_default_privacy_settings();
