import redis from '../config/redis';

export class RateLimitService {
    /**
     * Check if user has exceeded rate limit for a specific endpoint
     * @param userId - User ID
     * @param endpoint - API endpoint
     * @param maxRequests - Maximum requests allowed
     * @param windowMs - Time window in milliseconds
     * @returns Object with allowed status and retry info
     */
    async checkRateLimit(
        userId: string,
        endpoint: string,
        maxRequests: number = 100,
        windowMs: number = 3600000 // 1 hour default
    ): Promise<{
        allowed: boolean;
        remaining: number;
        retryAfter?: number;
    }> {
        const key = `rate_limit:${userId}:${endpoint}`;

        try {
            const currentCount = await redis.incr(key);

            if (currentCount === 1) {
                // First request, set expiry
                await redis.pexpire(key, windowMs);
            }

            const remaining = Math.max(0, maxRequests - currentCount);

            if (currentCount > maxRequests) {
                const ttl = await redis.pttl(key);
                return {
                    allowed: false,
                    remaining: 0,
                    retryAfter: Math.ceil(ttl / 1000),
                };
            }

            return {
                allowed: true,
                remaining,
            };
        } catch (error: any) {
            console.error('Rate limit check error:', error);
            // Fail open - allow request if Redis is down
            return {
                allowed: true,
                remaining: maxRequests,
            };
        }
    }

    /**
     * Get current rate limit status without incrementing
     */
    async getRateLimitStatus(
        userId: string,
        endpoint: string,
        maxRequests: number = 100
    ): Promise<{
        currentCount: number;
        remaining: number;
        resetAt: Date | null;
    }> {
        const key = `rate_limit:${userId}:${endpoint}`;

        try {
            const currentCount = parseInt((await redis.get(key)) || '0');
            const ttl = await redis.pttl(key);

            const resetAt = ttl > 0 ? new Date(Date.now() + ttl) : null;

            return {
                currentCount,
                remaining: Math.max(0, maxRequests - currentCount),
                resetAt,
            };
        } catch (error: any) {
            console.error('Get rate limit status error:', error);
            return {
                currentCount: 0,
                remaining: maxRequests,
                resetAt: null,
            };
        }
    }

    /**
     * Reset rate limit for a user (admin function)
     */
    async resetRateLimit(userId: string, endpoint?: string): Promise<void> {
        try {
            if (endpoint) {
                const key = `rate_limit:${userId}:${endpoint}`;
                await redis.del(key);
            } else {
                // Reset all rate limits for user
                const pattern = `rate_limit:${userId}:*`;
                const keys = await redis.keys(pattern);
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            }
        } catch (error: any) {
            console.error('Reset rate limit error:', error);
            throw new Error('Failed to reset rate limit');
        }
    }

    /**
     * Check user quota (e.g., total API calls per month)
     * Different from rate limiting - this tracks overall usage
     */
    async checkQuota(
        userId: string,
        quotaType: string,
        maxQuota: number,
        windowMs: number = 30 * 24 * 3600000 // 30 days default
    ): Promise<{
        allowed: boolean;
        used: number;
        remaining: number;
    }> {
        const key = `quota:${userId}:${quotaType}`;

        try {
            const currentUsage = await redis.incr(key);

            if (currentUsage === 1) {
                await redis.pexpire(key, windowMs);
            }

            const remaining = Math.max(0, maxQuota - currentUsage);

            return {
                allowed: currentUsage <= maxQuota,
                used: currentUsage,
                remaining,
            };
        } catch (error: any) {
            console.error('Quota check error:', error);
            return {
                allowed: true,
                used: 0,
                remaining: maxQuota,
            };
        }
    }
}

export default new RateLimitService();
