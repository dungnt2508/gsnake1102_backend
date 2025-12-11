import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ApplicationError } from '../shared/errors';
import { ZodError } from 'zod';

export async function errorHandler(
    error: Error | FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Log error with request context
    request.log.error({
        error,
        requestId: request.id,
        path: request.url,
        method: request.method,
        userId: request.user?.userId,
    });

    // Handle custom application errors
    if (error instanceof ApplicationError) {
        return reply.status(error.statusCode).send({
            error: true,
            code: error.code,
            message: error.message,
            details: error.details,
            requestId: request.id,
        });
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
        return reply.status(400).send({
            error: true,
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message,
            })),
            requestId: request.id,
        });
    }

    // Handle Fastify validation errors
    if ('validation' in error && error.validation) {
        return reply.status(400).send({
            error: true,
            code: 'VALIDATION_ERROR',
            message: 'Validation error',
            details: error.validation.map((v: any) => v.message),
            requestId: request.id,
        });
    }

    // Handle Fastify errors
    if ('statusCode' in error) {
        return reply.status(error.statusCode || 500).send({
            error: true,
            code: 'INTERNAL_ERROR',
            message: error.message,
            ...(isDevelopment && { stack: error.stack }),
            requestId: request.id,
        });
    }

    // Unknown errors
    return reply.status(500).send({
        error: true,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        ...(isDevelopment && { 
            stack: error.stack,
            details: error.message 
        }),
        requestId: request.id,
    });
}
