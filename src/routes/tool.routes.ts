import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import toolRepository from '../repositories/tool.repository';
import workflowService from '../services/workflow.service';
import { validate, createToolRequestSchema } from '../middleware/validation.middleware';
import { ToolRequestStatus } from '@gsnake/shared-types';
import { successResponse, createdResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse } from '../utils/response';

export default async function toolRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/tools
     * Get all tool requests for current user (Tool Mailbox)
     */
    fastify.get(
        '/',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number };
                const tools = await toolRepository.findByUserId(userId, Number(limit), Number(offset));

                successResponse(reply, { tools });
            } catch (error: unknown) {
                errorResponse(reply, 'Failed to get tool requests', 500, error);
            }
        }
    );

    /**
     * GET /api/tools/:id
     * Get specific tool request by ID
     */
    fastify.get(
        '/:id',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { id } = request.params as { id: string };
                const tool = await toolRepository.findById(id);

                if (!tool) {
                    return notFoundResponse(reply, 'Tool request not found');
                }

                successResponse(reply, { tool });
            } catch (error: unknown) {
                errorResponse(reply, 'Failed to get tool request', 500, error);
            }
        }
    );

    /**
     * POST /api/tools
     * Submit new tool generation request
     */
    fastify.post(
        '/',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const data = validate(createToolRequestSchema, request.body);
                
                // Business logic: New tool requests start as PENDING
                const toolRequest = await toolRepository.create({
                    user_id: userId,
                    request_payload: data.request_payload,
                    status: ToolRequestStatus.PENDING, // Business rule
                });

                // Trigger n8n workflow for tool generation
                workflowService
                    .triggerToolGeneration(toolRequest.id, data.request_payload, userId)
                    .then((workflowId) => {
                        if (workflowId) {
                            toolRepository.update(toolRequest.id, {
                                workflow_id: workflowId,
                                status: ToolRequestStatus.PROCESSING,
                            });
                        }
                    })
                    .catch((err) => {
                        console.error('Failed to trigger tool generation workflow:', err);
                        toolRepository.update(toolRequest.id, {
                            status: ToolRequestStatus.FAILED,
                        });
                    });

                createdResponse(reply, { tool: toolRequest }, 'Tool request submitted successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to submit tool request';
                badRequestResponse(reply, message);
            }
        }
    );

    /**
     * POST /api/tools/callback/:id
     * Webhook callback from n8n after tool generation
     */
    fastify.post('/callback/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as { id: string };
            const { result, success } = request.body as {
                result?: Record<string, any>;
                success: boolean;
            };

            if (!success) {
                await toolRepository.update(id, {
                    status: ToolRequestStatus.FAILED,
                });
                return reply.send({ success: true, message: 'Tool request marked as failed' });
            }

            if (!result) {
                return badRequestResponse(reply, 'Result is required');
            }

            const tool = await toolRepository.update(id, {
                result,
                status: ToolRequestStatus.DONE,
            });

            successResponse(reply, { tool }, 'Tool request updated successfully');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update tool request';
            badRequestResponse(reply, message);
        }
    });

    /**
     * DELETE /api/tools/:id
     * Delete tool request
     */
    fastify.delete(
        '/:id',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { id } = request.params as { id: string };
                await toolRepository.delete(id);

                successResponse(reply, null, 'Tool request deleted successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to delete tool request';
                badRequestResponse(reply, message);
            }
        }
    );
}
