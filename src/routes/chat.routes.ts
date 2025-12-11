import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import llmService from '../services/llm.service';
import { validate, chatRequestSchema } from '../middleware/validation.middleware';
import { successResponse, errorResponse, unauthorizedResponse } from '../utils/response';
import { OpenAIStreamChunk } from '../types/openai';
import { ZodError } from 'zod';
import { FRONTEND_URL } from '../config/env';
import { ChatMessage } from '@gsnake/shared-types';

export default async function chatRoutes(fastify: FastifyInstance) {
    /**
     * OPTIONS /api/chat
     * Handle CORS preflight requests
     */
    fastify.options('/', async (request: FastifyRequest, reply: FastifyReply) => {
        reply.code(204).send();
    });

    /**
     * POST /api/chat
     * Send chat message with persona injection
     * Supports streaming with SSE (Server-Sent Events)
     */
    fastify.post(
        '/',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    fastify.log.warn('Chat request without userId');
                    return unauthorizedResponse(reply);
                }

                fastify.log.debug({ userId, body: request.body as ChatMessage[] }, 'Chat request');
                
                const data = validate(chatRequestSchema, request.body as ChatMessage[]);
                const { messages = [], stream = false } = data;
                
                fastify.log.debug({ messagesCount: messages?.length, stream }, 'Validated chat data');

                if (stream) {
                    // Stream response using Server-Sent Events (SSE)
                    // Set CORS headers manually for streaming responses
                    const origin = request.headers.origin;
                    const allowedOrigin = process.env.NODE_ENV === 'development' 
                        ? (origin || '*')
                        : (origin === FRONTEND_URL ? origin : FRONTEND_URL);
                    
                    reply.raw.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'Access-Control-Allow-Origin': allowedOrigin,
                        'Access-Control-Allow-Credentials': 'true',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    });

                    const streamResponse = await llmService.chat(userId, messages, true);

                    // Stream tokens to client
                    for await (const chunk of streamResponse) {
                        const content = (chunk as OpenAIStreamChunk).choices[0]?.delta?.content || '';
                        if (content) {
                            reply.raw.write(`data: ${JSON.stringify({ content })}\n\n`);
                        }
                    }

                    reply.raw.write('data: [DONE]\n\n');
                    reply.raw.end();
                } else {
                    // Regular non-streaming response
                    const response = await llmService.chat(userId, messages, false);

                    successResponse(reply, {
                        message: {
                            role: 'assistant' as const,
                            content: response,
                        },
                    });
                }
            } catch (error: unknown) {
                fastify.log.error({ err: error }, 'Chat error');
                
                // Handle validation errors
                if (error instanceof ZodError) {
                    const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
                    if (reply.raw.headersSent) {
                        reply.raw.write(`data: ${JSON.stringify({ error: `Validation error: ${message}` })}\n\n`);
                        reply.raw.end();
                    } else {
                        errorResponse(reply, `Validation error: ${message}`, 400, error);
                    }
                    return;
                }
                
                if (reply.raw.headersSent) {
                    // If headers are sent (SSE started), we can't send a JSON error
                    const message = error instanceof Error ? error.message : 'Stream failed';
                    reply.raw.write(`data: ${JSON.stringify({ error: message })}\n\n`);
                    reply.raw.end();
                } else {
                    const message = error instanceof Error ? error.message : 'Chat failed';
                    const { AuthorizationError } = await import('../shared/errors');
                    const statusCode = error instanceof AuthorizationError ? 401 : 500;
                    errorResponse(reply, message, statusCode, error);
                }
            }
        }
    );

    /**
     * WebSocket endpoint for streaming chat
     * Alternative to SSE, using WebSocket
     */
    fastify.get(
        '/stream',
        { websocket: true },
        async (connection: any, request: any) => {
            try {
                // Verify token from query params or first message
                const token = (request.query as { token?: string })?.token;
                
                if (!token) {
                    connection.socket.close(1008, 'Missing authentication token');
                    return;
                }

                // Verify JWT token
                let userId: string;
                try {
                    const decoded = await fastify.jwt.verify<{ userId: string; email: string }>(token);
                    userId = decoded.userId;
                    if (!userId) {
                        connection.socket.close(1008, 'Invalid token payload');
                        return;
                    }
                } catch (err) {
                    connection.socket.close(1008, 'Invalid or expired token');
                    return;
                }

                connection.socket.on('message', async (message: any) => {
                    try {
                        const data = JSON.parse(message.toString());
                        const { messages } = data;

                        if (!messages) {
                            connection.socket.send(
                                JSON.stringify({ error: 'messages are required' })
                            );
                            return;
                        }

                        // Use verified userId from token, not from client
                        const streamResponse = await llmService.chat(userId, messages, true);

                        for await (const chunk of streamResponse) {
                            const content = (chunk as OpenAIStreamChunk).choices[0]?.delta?.content || '';
                            if (content) {
                                connection.socket.send(
                                    JSON.stringify({
                                        type: 'chunk',
                                        content,
                                    })
                                );
                            }
                        }

                        connection.socket.send(
                            JSON.stringify({
                                type: 'done',
                            })
                        );
                    } catch (error: any) {
                        connection.socket.send(
                            JSON.stringify({
                                error: error.message,
                            })
                        );
                    }
                });

                connection.socket.on('close', () => {
                    console.log('WebSocket connection closed');
                });
            } catch (error: any) {
                console.error('WebSocket error:', error);
            }
        }
    );
}
