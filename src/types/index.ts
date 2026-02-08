// src/types/index.ts
import { Role, PlatformType, CheckInVisibility, TaskStatus, DeviationSeverity } from '@prisma/client';

export { Role, PlatformType, CheckInVisibility, TaskStatus, DeviationSeverity };

export interface UserPayload {
    id: string;
    platformId: string;
    platformType: PlatformType;
    role: Role;
    email?: string;
}

export interface CheckInData {
    moodScore: number; // 1-10
    workloadLevel: number; // 1-10
    notes?: string;
    visibility: CheckInVisibility;
}

export interface TaskData {
    title: string;
    description?: string;
    assignedTo: string;
    dueDate?: Date;
}

export interface RecognitionData {
    toUserId: string;
    message: string;
    isPublic: boolean;
}

export interface DeviationData {
    userId: string;
    severity: DeviationSeverity;
    type: string;
    description: string;
}

// Platform-agnostic message types
export interface MessageAction {
    id: string;
    text: string;
    value: string;
    style?: 'primary' | 'danger' | 'default';
}

export interface MessageField {
    label: string;
    value: string;
    short?: boolean;
}

export interface MessageBlock {
    type: 'section' | 'divider' | 'actions' | 'input';
    text?: string;
    fields?: MessageField[];
    actions?: MessageAction[];
    accessory?: any;
}

export interface PlatformMessage {
    text: string;
    blocks?: MessageBlock[];
    ephemeral?: boolean;
}

// Conversation state types
export interface ConversationState {
    userId: string;
    platformType: PlatformType;
    channelId: string;
    flowType: 'checkin' | 'task' | 'recognition' | 'settings';
    currentStep: string;
    data: Record<string, any>;
    createdAt: Date;
    expiresAt: Date;
}

// AIInsight types
export interface AIInsightRequest {
    type: 'team_wellbeing' | 'individual_pattern' | 'workload_distribution';
    timeRange: { start: Date; end: Date };
    userId?: string;
    teamId?: string;
}

export interface AIInsightResponse {
    insights: string[];
    recommendations: string[];
    metadata: {
        isAdvisoryOnly: true; // Always true, enforced by guardrails
        generatedAt: Date;
        dataPoints: number;
    };
}
