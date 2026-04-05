import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  // Database
  ACCESS_DB_PATH: z.string().min(1),
  SQLITE_DB_PATH: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('24h'),
  ADMIN_JWT_EXPIRES_IN: z.string().default('30m'),

  // Admin
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD_HASH: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // WhatsApp
  WHATSAPP_SESSION_PATH: z.string().optional(),
  WHATSAPP_ENABLED: z.string().transform((v) => v === 'true').default('false'),

  // SMS
  GSM_PORT: z.string().optional(),
  GSM_BAUD_RATE: z.string().optional(),
  GSM_ENABLED: z.string().transform((v) => v === 'true').default('false'),

  // System
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  POLLING_INTERVAL_MS: z.string().transform(Number).default('5000'),
  STAGING_MODE: z.string().transform((v) => v === 'true').default('false'),
  STAGING_WHITELIST: z.string().default(''),

  // PostHog
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().optional(),

  // Push Notifications
  VAPID_PUBLIC_KEY: z.string().min(10),
  VAPID_PRIVATE_KEY: z.string().min(10),
  VAPID_SUBJECT: z.string().default('mailto:admin@hardware-portal.com'),

  // CORS
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
