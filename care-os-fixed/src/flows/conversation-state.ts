// src/flows/conversation-state.ts
import Redis from 'ioredis';
import { config } from '../config/index.js';
import { ConversationState } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('conversation-state');
const redis = new Redis(config.redisUrl);

const STATE_TTL = 60 * 60; // 1 hour

/**
 * Get conversation state from Redis
 */
export async function getConversationState(
    platformType: string,
    userId: string,
    channelId: string
): Promise<ConversationState | null> {
    const key = `conversation:${platformType}:${userId}:${channelId}`;

    try {
        const data = await redis.get(key);
        if (!data) return null;

        const state = JSON.parse(data) as ConversationState;
        state.createdAt = new Date(state.createdAt);
        state.expiresAt = new Date(state.expiresAt);

        return state;
    } catch (error) {
        logger.error('Failed to get conversation state', { error, key });
        return null;
    }
}

/**
 * Set conversation state in Redis
 */
export async function setConversationState(state: ConversationState): Promise<void> {
    const key = `conversation:${state.platformType}:${state.userId}:${state.channelId}`;

    try {
        await redis.setex(key, STATE_TTL, JSON.stringify(state));
    } catch (error) {
        logger.error('Failed to set conversation state', { error, key });
        throw error;
    }
}

/**
 * Update conversation state
 */
export async function updateConversationState(
    platformType: string,
    userId: string,
    channelId: string,
    updates: Partial<Omit<ConversationState, 'userId' | 'platformType' | 'channelId'>>
): Promise<ConversationState | null> {
    const current = await getConversationState(platformType, userId, channelId);

    if (!current) {
        logger.warn('Attempted to update non-existent conversation state');
        return null;
    }

    const updated: ConversationState = {
        ...current,
        ...updates,
    };

    await setConversationState(updated);
    return updated;
}

/**
 * Clear conversation state
 */
export async function clearConversationState(
    platformType: string,
    userId: string,
    channelId: string
): Promise<void> {
    const key = `conversation:${platformType}:${userId}:${channelId}`;

    try {
        await redis.del(key);
    } catch (error) {
        logger.error('Failed to clear conversation state', { error, key });
    }
}

/**
 * Create new conversation state
 */
export async function createConversationState(
    userId: string,
    platformType: any,
    channelId: string,
    flowType: ConversationState['flowType']
): Promise<ConversationState> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + STATE_TTL * 1000);

    const state: ConversationState = {
        userId,
        platformType,
        channelId,
        flowType,
        currentStep: 'START',
        data: {},
        createdAt: now,
        expiresAt,
    };

    await setConversationState(state);
    return state;
}
