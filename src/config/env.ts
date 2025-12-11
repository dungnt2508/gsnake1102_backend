import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment variables validation schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
    // Server
    PORT: z.string().default('3001').transform(Number),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),

    // JWT (Required)
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

    // Database (Required)
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.string().default('5433').transform(Number),
    DB_NAME: z.string().min(1),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),

    // Redis
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.string().default('6379').transform(Number),
    REDIS_PASSWORD: z.string().optional(),

    // OpenAI / LiteLLM
    OPENAI_API_KEY: z.string().optional(),
    LITELLM_API_KEY: z.string().optional(),
    LITELLM_BASE_URL: z.string().url().optional(),
    LITELLM_DEFAULT_CHAT_MODEL: z.string().optional(),
    LITELLM_DEFAULT_EMBEDDING_MODEL: z.string().optional(),

    // Azure OAuth (Optional, but if one is set, all must be set)
    AZURE_CLIENT_ID: z.string().optional(),
    AZURE_CLIENT_SECRET: z.string().optional(),
    AZURE_TENANT_ID: z.string().optional(),
    AZURE_REDIRECT_URI: z.string().url().optional(),

    // Google OAuth (Optional, but if one is set, all must be set)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z.string().url().optional(),

    // n8n (Optional)
    N8N_BASE_URL: z.string().url().optional(),
    N8N_API_KEY: z.string().optional(),

    // Rate Limiting
    RATE_LIMIT_MAX: z.string().default('100').transform(Number),
    RATE_LIMIT_WINDOW: z.string().default('3600000').transform(Number),

    // File Storage (Optional)
    UPLOAD_DIR: z.string().optional(),
    UPLOAD_BASE_URL: z.string().default('/uploads'),
}).refine(
    (data) => {
        // If any Azure OAuth var is set, all must be set
        const hasAnyAzure = data.AZURE_CLIENT_ID || data.AZURE_CLIENT_SECRET || data.AZURE_TENANT_ID;
        if (hasAnyAzure) {
            return !!(data.AZURE_CLIENT_ID && data.AZURE_CLIENT_SECRET && data.AZURE_TENANT_ID);
        }
        return true;
    },
    {
        message: 'If using Azure OAuth, all of AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID must be set',
    }
).refine(
    (data) => {
        // If any Google OAuth var is set, all must be set
        const hasAnyGoogle = data.GOOGLE_CLIENT_ID || data.GOOGLE_CLIENT_SECRET || data.GOOGLE_REDIRECT_URI;
        if (hasAnyGoogle) {
            return !!(data.GOOGLE_CLIENT_ID && data.GOOGLE_CLIENT_SECRET && data.GOOGLE_REDIRECT_URI);
        }
        return true;
    },
    {
        message: 'If using Google OAuth, all of GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI must be set',
    }
).refine(
    (data) => {
        // At least one LLM provider must be configured
        return !!(data.OPENAI_API_KEY || data.LITELLM_API_KEY);
    },
    {
        message: 'Either OPENAI_API_KEY or LITELLM_API_KEY must be set',
    }
);

/**
 * Validated environment variables
 * Throws error if validation fails
 */
export const env = envSchema.parse(process.env);

/**
 * Export individual env vars for convenience
 */
export const {
    PORT,
    NODE_ENV,
    FRONTEND_URL,
    JWT_SECRET,
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD,
    OPENAI_API_KEY,
    LITELLM_API_KEY,
    LITELLM_BASE_URL,
    LITELLM_DEFAULT_CHAT_MODEL,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
} = env;

