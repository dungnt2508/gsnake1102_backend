import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import { v4 as uuidv4 } from 'uuid';

// Validate environment variables at startup
// This will throw if required env vars are missing
import { env, JWT_SECRET, FRONTEND_URL, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW, PORT } from './config/env';
import { checkDatabaseHealth } from './config/database';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import personaRoutes from './routes/persona.routes';
import articleRoutes from './routes/article.routes';
import scheduleRoutes from './routes/schedule.routes';
import toolRoutes from './routes/tool.routes';
import chatRoutes from './routes/chat.routes';
import sourceRoutes from './routes/source.routes';
import summaryRoutes from './routes/summary.routes';
import productRoutes from './routes/product.routes';
import adminRoutes from './routes/admin.routes';
import sellerRoutes from './routes/seller.routes';
import reviewRoutes from './routes/review.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { authenticate } from './middleware/auth.middleware';

const fastify = Fastify({
    logger: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
});

// Register plugins
async function start() {
    try {
        // Check database health before starting
        const dbHealthy = await checkDatabaseHealth();
        if (!dbHealthy) {
            throw new Error('Database health check failed. Please check your database connection.');
        }

        // CORS - Allow all localhost origins in development
        await fastify.register(cors, {
            origin: process.env.NODE_ENV === 'development' 
                ? true // Allow all origins in development
                : FRONTEND_URL,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            exposedHeaders: ['Content-Type'],
            maxAge: 86400, // 24 hours
        });

        // Add request ID tracking (after CORS to ensure headers are set)
        fastify.addHook('onRequest', async (request, reply) => {
            request.id = uuidv4();
            reply.header('X-Request-ID', request.id);
        });

        // JWT (secret is validated in env.ts)
        await fastify.register(jwt, {
            secret: JWT_SECRET,
        });

        // Multipart
        await fastify.register(multipart);

        // Rate limiting - More lenient in development
        await fastify.register(rateLimit, {
            max: process.env.NODE_ENV === 'development' 
                ? RATE_LIMIT_MAX * 10  // 10x limit in development
                : RATE_LIMIT_MAX,
            timeWindow: process.env.NODE_ENV === 'development'
                ? RATE_LIMIT_WINDOW / 6  // 10 minutes instead of 1 hour in development
                : RATE_LIMIT_WINDOW,
            errorResponseBuilder: (request, context) => {
                return {
                    error: true,
                    message: `Rate limit exceeded, retry in ${Math.ceil(context.ttl / 60)} minutes`,
                    statusCode: 429,
                    retryAfter: Math.ceil(context.ttl / 1000),
                };
            },
        });

        // WebSocket for streaming
        await fastify.register(websocket);

        // Health check with database status
        fastify.get('/health', async () => {
            const dbStatus = await checkDatabaseHealth();
            return {
                status: dbStatus ? 'ok' : 'degraded',
                timestamp: new Date().toISOString(),
                database: dbStatus ? 'connected' : 'disconnected',
            };
        });

        // Decorate with auth middleware
        fastify.decorate('authenticate', authenticate);

        // Register routes
        await fastify.register(authRoutes, { prefix: '/api/auth' });
        await fastify.register(userRoutes, { prefix: '/api/users' });
        await fastify.register(personaRoutes, { prefix: '/api/personas' });
        await fastify.register(articleRoutes, { prefix: '/api/articles' });
        await fastify.register(scheduleRoutes, { prefix: '/api/schedules' });
        await fastify.register(toolRoutes, { prefix: '/api/tools' });
        await fastify.register(chatRoutes, { prefix: '/api/chat' });
        await fastify.register(sourceRoutes, { prefix: '/api/sources' });
        await fastify.register(summaryRoutes, { prefix: '/api/summaries' });
        await fastify.register(productRoutes, { prefix: '/api/products' });
        await fastify.register(adminRoutes, { prefix: '/api/admin' });
        await fastify.register(sellerRoutes, { prefix: '/api/seller' });
        await fastify.register(reviewRoutes, { prefix: '/api/reviews' });

        // Error handler
        fastify.setErrorHandler(errorHandler);

        // Start server
        await fastify.listen({ port: PORT, host: '0.0.0.0' });

        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

start();
