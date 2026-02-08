import Redis from 'ioredis';
import config from '../config/index.js';

class StateService {
    constructor() {
        this.useRedis = !!config.redis.url || (config.redis.host && config.redis.host !== 'localhost');
        this.memoryStore = new Map();
        
        if (this.useRedis) {
            console.log('Initializing Redis connection...');
            this.redis = new Redis({
                host: config.redis.host,
                port: config.redis.port,
                retryStrategy: (times) => Math.min(times * 50, 2000),
            });

            this.redis.on('error', (err) => console.error('Redis connection error:', err));
            this.redis.on('connect', () => console.log('Redis connected'));
        } else {
            console.log('Redis not configured. Using in-memory storage for state.');
        }

        this.defaultTTL = 1800;
    }

    _getKey(userId, platform, conversationId) {
        return `state:${platform}:${userId}:${conversationId}`;
    }

    async saveState(userId, platform, conversationId, state, ttl = null) {
        const key = this._getKey(userId, platform, conversationId);
        const stateData = {
            userId, platform, conversationId,
            flowType: state.flowType,
            currentStep: state.currentStep,
            data: state.data || {},
            updatedAt: new Date().toISOString(),
        };

        if (this.useRedis) {
            await this.redis.setex(key, ttl || this.defaultTTL, JSON.stringify(stateData));
        } else {
            this.memoryStore.set(key, stateData);
        }
        return stateData;
    }

    async getState(userId, platform, conversationId) {
        const key = this._getKey(userId, platform, conversationId);
        
        if (this.useRedis) {
            const data = await this.redis.get(key);
            return data ? JSON.parse(data) : null;
        } else {
            return this.memoryStore.get(key) || null;
        }
    }

    async updateState(userId, platform, conversationId, updates) {
        const existingState = await this.getState(userId, platform, conversationId);
        if (!existingState) throw new Error('State not found');

        const updatedState = {
            ...existingState,
            currentStep: updates.currentStep || existingState.currentStep,
            data: { ...existingState.data, ...updates.data },
            updatedAt: new Date().toISOString(),
        };

        await this.saveState(userId, platform, conversationId, updatedState);
        return updatedState;
    }

    async deleteState(userId, platform, conversationId) {
        const key = this._getKey(userId, platform, conversationId);
        if (this.useRedis) {
            await this.redis.del(key);
        } else {
            this.memoryStore.delete(key);
        }
    }

    async extendStateTTL(userId, platform, conversationId, ttl = null) {
        // In-memory does not support TTL in this simple version
        if (this.useRedis) {
            const key = this._getKey(userId, platform, conversationId);
            await this.redis.expire(key, ttl || this.defaultTTL);
        }
    }

    async hasState(userId, platform, conversationId) {
        const key = this._getKey(userId, platform, conversationId);
        if (this.useRedis) {
            return (await this.redis.exists(key)) === 1;
        } else {
            return this.memoryStore.has(key);
        }
    }

    async close() {
        if (this.useRedis) await this.redis.quit();
    }
}

export default new StateService();
