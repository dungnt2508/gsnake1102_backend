import { FastifyRequest, FastifyReply } from 'fastify';
import redis from '../config/redis';
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW } from '../config/env';

/**
 * Rate limiting middleware using Redis
 * Implements sliding window algorithm
 */
export const rateLimitMiddleware = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const userId = request.user?.userId;
    if (!userId) return; // Skip if not authenticated

    // Get route path from Fastify route context
    const endpoint = (request as { routerPath?: string }).routerPath || request.url;
    const key = `rate_limit:${userId}:${endpoint}`;

    const maxRequests = RATE_LIMIT_MAX;
    const windowMs = RATE_LIMIT_WINDOW;

    try {
        const currentCount = await redis.incr(key);

        if (currentCount === 1) {
            // First request, set expiry
            await redis.pexpire(key, windowMs);
        }

        if (currentCount > maxRequests) {
            const ttl = await redis.pttl(key);
            reply.status(429).send({
                error: true,
                message: 'Rate limit exceeded',
                statusCode: 429,
                retryAfter: Math.ceil(ttl / 1000),
            });
            return;
        }

        // Add rate limit headers
        reply.header('X-RateLimit-Limit', maxRequests.toString());
        reply.header('X-RateLimit-Remaining', (maxRequests - currentCount).toString());
    } catch (err) {
        request.log.error({ err }, 'Rate limiting error');
        // Don't block request if Redis fails
    }
};
