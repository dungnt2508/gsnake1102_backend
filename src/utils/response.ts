import { FastifyReply } from 'fastify';

/**
 * Standard success response
 */
export function successResponse<T>(
    reply: FastifyReply,
    data: T,
    message?: string,
    statusCode: number = 200
): void {
    reply.status(statusCode).send({
        success: true,
        message,
        data,
    });
}

/**
 * Standard error response
 */
export function errorResponse(
    reply: FastifyReply,
    message: string,
    statusCode: number = 500,
    error?: any
): void {
    reply.status(statusCode).send({
        error: true,
        message,
        statusCode,
        ...(process.env.NODE_ENV === 'development' && error && { details: error }),
    });
}

/**
 * Created response (201)
 */
export function createdResponse<T>(
    reply: FastifyReply,
    data: T,
    message?: string
): void {
    successResponse(reply, data, message, 201);
}

/**
 * Not found response (404)
 */
export function notFoundResponse(
    reply: FastifyReply,
    message: string = 'Resource not found'
): void {
    errorResponse(reply, message, 404);
}

/**
 * Unauthorized response (401)
 */
export function unauthorizedResponse(
    reply: FastifyReply,
    message: string = 'Unauthorized'
): void {
    errorResponse(reply, message, 401);
}

/**
 * Bad request response (400)
 */
export function badRequestResponse(
    reply: FastifyReply,
    message: string = 'Bad request'
): void {
    errorResponse(reply, message, 400);
}

/**
 * Rate limit response (429)
 */
export function rateLimitResponse(
    reply: FastifyReply,
    retryAfter?: number,
    message: string = 'Rate limit exceeded'
): void {
    reply.status(429).send({
        error: true,
        message,
        statusCode: 429,
        ...(retryAfter && { retryAfter }),
    });
}

