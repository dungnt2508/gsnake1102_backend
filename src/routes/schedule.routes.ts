import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import scheduleRepository from '../repositories/schedule.repository';
import { validate, createScheduleSchema } from '../middleware/validation.middleware';
import { successResponse, createdResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse } from '../utils/response';

export default async function scheduleRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/schedules
     * Get all schedules for current user
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

                const schedules = await scheduleRepository.findByUserId(userId);

                successResponse(reply, { schedules });
            } catch (error: unknown) {
                errorResponse(reply, 'Failed to get schedules', 500, error);
            }
        }
    );

    /**
     * POST /api/schedules
     * Create new fetch schedule
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

                const data = validate(createScheduleSchema, request.body);
                
                // Business logic: Calculate next fetch time and set active status
                const { calculateNextFetch } = await import('../utils/schedule-utils');
                const { SourceType } = await import('@gsnake/shared-types');
                if (!data.source_type || !data.source_value) {
                    return badRequestResponse(reply, 'source_type and source_value are required');
                }
                // Map string literal to SourceType enum value
                const sourceTypeMap: Record<string, typeof SourceType[keyof typeof SourceType]> = {
                    'url': SourceType.URL,
                    'rss': SourceType.RSS,
                    'file': SourceType.FILE,
                };
                const schedule = await scheduleRepository.create({
                    user_id: userId,
                    source_type: sourceTypeMap[data.source_type] || SourceType.URL,
                    source_value: data.source_value,
                    frequency: data.frequency,
                    next_fetch: calculateNextFetch(data.frequency), // Business rule
                    active: true, // Business rule: New schedules are active by default
                });

                createdResponse(reply, { schedule }, 'Schedule created successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to create schedule';
                badRequestResponse(reply, message);
            }
        }
    );

    /**
     * PUT /api/schedules/:id
     * Update fetch schedule
     */
    fastify.put(
        '/:id',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { id } = request.params as { id: string };
                const { frequency } = request.body as { frequency?: string };

                if (!frequency) {
                    return badRequestResponse(reply, 'Frequency is required');
                }

                // Business logic: Recalculate next_fetch when frequency changes
                const { calculateNextFetch } = await import('../utils/schedule-utils');
                const schedule = await scheduleRepository.update(id, {
                    frequency,
                    next_fetch: calculateNextFetch(frequency), // Business rule
                });

                if (!schedule) {
                    return notFoundResponse(reply, 'Schedule not found');
                }

                successResponse(reply, { schedule }, 'Schedule updated successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to update schedule';
                badRequestResponse(reply, message);
            }
        }
    );

    /**
     * DELETE /api/schedules/:id
     * Delete fetch schedule
     */
    fastify.delete(
        '/:id',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { id } = request.params as { id: string };
                await scheduleRepository.delete(id);

                successResponse(reply, null, 'Schedule deleted successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to delete schedule';
                badRequestResponse(reply, message);
            }
        }
    );
}
