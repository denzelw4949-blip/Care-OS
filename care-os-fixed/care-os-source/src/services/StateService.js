import Redis from 'ioredis';
import config from '../config/index.js';

/**
 * State Management Service
 * Redis-backed session management for stateless architecture
 * Ensures conversation state persists across interactions
 */

class StateService {
    constructor() {
        this.redis = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        this.redis.on('error', (err) => {
            console.error('Redis connection error:', err);
        });

        this.redis.on('connect', () => {
            console.log('Redis connected');
        });

        // Default TTL for conversation state (30 minutes)
        this.defaultTTL = 1800;
    }

    /**
     * Generate state key
     */
    _getKey(userId, platform, conversationId) {
        return `state:${platform}:${userId}:${conversationId}`;
    }

    /**
     * Save conversation state
     * @param {string} userId - Internal user ID
     * @param {string} platform - 'slack' or 'teams'
     * @param {string} conversationId - Platform conversation ID
     * @param {Object} state - State data to save
     * @param {number} ttl - Time to live in seconds
     */
    async saveState(userId, platform, conversationId, state, ttl = null) {
        const key = this._getKey(userId, platform, conversationId);
        const stateData = {
            userId,
            platform,
            conversationId,
            flowType: state.flowType,
            currentStep: state.currentStep,
            data: state.data || {},
            updatedAt: new Date().toISOString(),
        };

        await this.redis.setex(
            key,
            ttl || this.defaultTTL,
            JSON.stringify(stateData)
        );

        return stateData;
    }

    /**
     * Get conversation state
     */
    async getState(userId, platform, conversationId) {
        const key = this._getKey(userId, platform, conversationId);
        const data = await this.redis.get(key);

        if (!data) {
            return null;
        }

        return JSON.parse(data);
    }

    /**
     * Update conversation state
     */
    async updateState(userId, platform, conversationId, updates) {
        const existingState = await this.getState(userId, platform, conversationId);

        if (!existingState) {
            throw new Error('State not found');
        }

        const updatedState = {
            ...existingState,
            currentStep: updates.currentStep || existingState.currentStep,
            data: {
                ...existingState.data,
                ...updates.data,
            },
            updatedAt: new Date().toISOString(),
        };

        await this.saveState(userId, platform, conversationId, updatedState);
        return updatedState;
    }

    /**
     * Delete conversation state
     */
    async deleteState(userId, platform, conversationId) {
        const key = this._getKey(userId, platform, conversationId);
        await this.redis.del(key);
    }

    /**
     * Extend state TTL (for long conversations)
     */
    async extendStateTTL(userId, platform, conversationId, ttl = null) {
        const key = this._getKey(userId, platform, conversationId);
        await this.redis.expire(key, ttl || this.defaultTTL);
    }

    /**
     * Check if state exists
     */
    async hasState(userId, platform, conversationId) {
        const key = this._getKey(userId, platform, conversationId);
        const exists = await this.redis.exists(key);
        return exists === 1;
    }

    /**
     * Get all active states for a user (debugging)
     */
    async getUserStates(userId, platform) {
        const pattern = `state:${platform}:${userId}:*`;
        const keys = await this.redis.keys(pattern);

        const states = [];
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                states.push(JSON.parse(data));
            }
        }

        return states;
    }

    /**
     * Clean up expired states (called by background job)
     */
    async cleanupExpiredStates() {
        // Redis handles TTL expiration automatically
        // This is a placeholder for manual cleanup if needed
        console.log('State cleanup: Redis auto-expires keys with TTL');
    }

    /**
     * Close Redis connection
     */
    async close() {
        await this.redis.quit();
    }
}

// Export singleton instance
export default new StateService();
