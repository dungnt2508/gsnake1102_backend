import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTPayload } from '@gsnake/shared-types';

/**
 * Extend Fastify types to include authenticated user
 */
declare module 'fastify' {
    interface FastifyRequest {
        user?: JWTPayload;
        id?: string; // Request ID
    }

    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

/**
 * Extend Fastify JWT types
 */
declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: JWTPayload;
        user: JWTPayload;
    }
}

