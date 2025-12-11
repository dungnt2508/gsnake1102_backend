import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from './env';

const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on('connect', () => {
    console.log('✅ Redis connected');
});

redis.on('error', (err) => {
    console.error('❌ Redis error:', err);
});

export default redis;
