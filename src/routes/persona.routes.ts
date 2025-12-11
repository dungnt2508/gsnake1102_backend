import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import personaService from '../services/persona.service';
import { validate, createPersonaSchema, updatePersonaSchema } from '../middleware/validation.middleware';
import { successResponse, createdResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse } from '../utils/response';

export default async function personaRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/personas
     * Get current user's persona
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

                const persona = await personaService.getPersona(userId);

                if (!persona) {
                    return notFoundResponse(reply, 'Persona not found. Create one first.');
                }

                successResponse(reply, { persona });
            } catch (error: unknown) {
                errorResponse(reply, 'Failed to get persona', 500, error);
            }
        }
    );

    /**
     * POST /api/personas
     * Create persona for current user
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

                const data = validate(createPersonaSchema, request.body);
                const persona = await personaService.createPersona({
                    ...data,
                    user_id: userId,
                });

                createdResponse(reply, { persona }, 'Persona created successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to create persona';
                badRequestResponse(reply, message);
            }
        }
    );

    /**
     * PUT /api/personas
     * Update current user's persona
     */
    fastify.put(
        '/',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const data = validate(updatePersonaSchema, request.body);
                const persona = await personaService.updatePersona(userId, data);

                successResponse(reply, { persona }, 'Persona updated successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to update persona';
                badRequestResponse(reply, message);
            }
        }
    );

    /**
     * DELETE /api/personas
     * Delete current user's persona
     */
    fastify.delete(
        '/',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                await personaService.deletePersona(userId);

                successResponse(reply, null, 'Persona deleted successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to delete persona';
                badRequestResponse(reply, message);
            }
        }
    );
}
