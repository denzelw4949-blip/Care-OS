// src/config/index.ts
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
    // Server
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    port: z.coerce.number().default(3000),

    // Database
    databaseUrl: z.string(),

    // Redis
    redisUrl: z.string().default('redis://localhost:6379'),

    // JWT
    jwtSecret: z.string(),
    jwtExpiresIn: z.string().default('24h'),

    // Slack
    slack: z.object({
        botToken: z.string().optional(),
        signingSecret: z.string().optional(),
        appToken: z.string().optional(),
        clientId: z.string().optional(),
        clientSecret: z.string().optional(),
    }),

    // Microsoft Teams
    teams: z.object({
        appId: z.string().optional(),
        appPassword: z.string().optional(),
        tenantId: z.string().optional(),
    }),

    // AI Provider
    openai: z.object({
        apiKey: z.string().optional(),
        model: z.string().default('gpt-4-turbo-preview'),
    }),

    gemini: z.object({
        apiKey: z.string().optional(),
        model: z.string().default('gemini-pro'),
    }),

    // Guardrails
    enableGuardrails: z.coerce.boolean().default(true),
    guardrailLogLevel: z.enum(['verbose', 'normal', 'silent']).default('normal'),

    // Deviation Detection
    deviationThresholdPercent: z.coerce.number().default(25),
    deviationLookbackDays: z.coerce.number().default(7),

    // Check-in Schedule
    checkinSchedule: z.string().default('0 9 * * 1-5'), // 9 AM weekdays
});

const rawConfig = {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    slack: {
        botToken: process.env.SLACK_BOT_TOKEN,
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        appToken: process.env.SLACK_APP_TOKEN,
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
    },
    teams: {
        appId: process.env.TEAMS_APP_ID,
        appPassword: process.env.TEAMS_APP_PASSWORD,
        tenantId: process.env.TEAMS_TENANT_ID,
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL,
    },
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL,
    },
    enableGuardrails: process.env.ENABLE_GUARDRAILS,
    guardrailLogLevel: process.env.GUARDRAIL_LOG_LEVEL,
    deviationThresholdPercent: process.env.DEVIATION_THRESHOLD_PERCENT,
    deviationLookbackDays: process.env.DEVIATION_LOOKBACK_DAYS,
    checkinSchedule: process.env.CHECKIN_SCHEDULE,
};

export const config = configSchema.parse(rawConfig);
