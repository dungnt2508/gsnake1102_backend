import { env } from './env';

// Environment variables are validated in env.ts
// This config uses the validated values
export const authConfig = {
    azure: {
        clientId: env.AZURE_CLIENT_ID || '',
        clientSecret: env.AZURE_CLIENT_SECRET || '',
        tenantId: env.AZURE_TENANT_ID || '',
        redirectUri: env.AZURE_REDIRECT_URI || 'http://localhost:3000/auth/azure/callback',
        authEndpoint: env.AZURE_TENANT_ID 
            ? `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`
            : '',
        tokenEndpoint: env.AZURE_TENANT_ID
            ? `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/token`
            : '',
        scope: 'openid profile email',
    },
    google: {
        clientId: env.GOOGLE_CLIENT_ID || '',
        clientSecret: env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback/google',
        authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
        scope: 'openid email profile',
    },
    jwt: {
        secret: env.JWT_SECRET, // Already validated in env.ts
        expiresIn: '7d',
    },
};
