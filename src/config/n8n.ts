import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const n8nConfig = {
    baseUrl: process.env.N8N_BASE_URL || 'https://abc.pnj.com',
    apiKey: process.env.N8N_API_KEY || '',

    // Webhook URLs for different workflows
    webhooks: {
        articleSummary: `${process.env.N8N_BASE_URL}/webhook/article-summary`,
        scheduledFetch: `${process.env.N8N_BASE_URL}/webhook/scheduled-fetch`,
        toolGeneration: `${process.env.N8N_BASE_URL}/webhook/tool-generation`,
    },
};

// Create axios instance for n8n API calls
export const n8nClient = axios.create({
    baseURL: n8nConfig.baseUrl,
    headers: {
        'X-N8N-API-KEY': n8nConfig.apiKey,
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Interceptor for logging
n8nClient.interceptors.request.use(
    (config) => {
        console.log(`📤 n8n Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => Promise.reject(error)
);

n8nClient.interceptors.response.use(
    (response) => {
        console.log(`📥 n8n Response: ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        console.error(`❌ n8n Error: ${error.message}`);
        return Promise.reject(error);
    }
);
