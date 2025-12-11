import { FastifyRequest, FastifyReply } from 'fastify';
import { sanitizeUrl, sanitizeString } from '../utils/sanitize';

/**
 * Middleware to sanitize request body
 * Sanitizes string inputs to prevent XSS attacks
 */
export async function sanitizeBody(
    request: FastifyRequest,
    reply: FastifyReply
) {
    if (request.body && typeof request.body === 'object') {
        const body = request.body as Record<string, any>;
        
        // Recursively sanitize string values
        const sanitizeObject = (obj: any): any => {
            if (typeof obj === 'string') {
                // Don't sanitize URLs - they should be validated separately
                if (obj.startsWith('http://') || obj.startsWith('https://')) {
                    return obj; // URL validation happens in route handlers
                }
                return sanitizeString(obj);
            } else if (Array.isArray(obj)) {
                return obj.map(sanitizeObject);
            } else if (obj && typeof obj === 'object') {
                const sanitized: Record<string, any> = {};
                for (const key in obj) {
                    sanitized[key] = sanitizeObject(obj[key]);
                }
                return sanitized;
            }
            return obj;
        };

        // Replace body with sanitized version
        (request as { body?: any }).body = sanitizeObject(body);
    }
}

/**
 * Middleware to sanitize query parameters
 */
export async function sanitizeQuery(
    request: FastifyRequest,
    reply: FastifyReply
) {
    if (request.query && typeof request.query === 'object') {
        const query = request.query as Record<string, any>;
        
        for (const key in query) {
            if (typeof query[key] === 'string') {
                query[key] = sanitizeString(query[key] as string);
            }
        }
    }
}

