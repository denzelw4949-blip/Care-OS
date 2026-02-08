import dotenv from 'dotenv';
dotenv.config();

const config = {
  // Application
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  // Database
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'care_os',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Slack
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
  },

  // Microsoft Teams
  teams: {
    appId: process.env.TEAMS_APP_ID,
    appPassword: process.env.TEAMS_APP_PASSWORD,
    tenantId: process.env.TEAMS_TENANT_ID,
  },

  // AI Configuration
  ai: {
    provider: process.env.AI_PROVIDER || 'openai', // 'openai' or 'gemini'
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-pro',
    },
  },

  // Ethical Guardrails
  guardrails: {
    enabled: process.env.ENABLE_GUARDRAILS !== 'false',
    logLevel: process.env.GUARDRAIL_LOG_LEVEL || 'verbose',
  },

  // Deviation Detection
  deviation: {
    thresholdPercent: parseFloat(process.env.DEVIATION_THRESHOLD_PERCENT || '25'),
    lookbackDays: parseInt(process.env.DEVIATION_LOOKBACK_DAYS || '7', 10),
  },

  // Check-in Schedule
  checkIn: {
    schedule: process.env.CHECKIN_SCHEDULE || '0 9 * * 1-5', // 9 AM weekdays
  },
};

// Validation for required config
const validateConfig = () => {
  const required = {
    'JWT_SECRET': config.jwt.secret,
    'DB connection': config.database.url || config.database.user,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.warn(`Missing configuration: ${missing.join(', ')} - using defaults or limited functionality`);
  }
};

if (config.env !== 'test') {
  validateConfig();
}

export default config;
