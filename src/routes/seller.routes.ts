import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import sellerService from '../services/seller.service';
import { successResponse, errorResponse, unauthorizedResponse, badRequestResponse } from '../utils/response';
import { z } from 'zod';
import { validate } from '../middleware/validation.middleware';

export default async function sellerRoutes(fastify: FastifyInstance) {
    /**
     * POST /api/seller/apply
     * Request seller status (authenticated users only)
     */
    fastify.post(
        '/apply',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const body = request.body as { application_data?: Record<string, any> } | undefined;
                await sellerService.requestSellerStatus(userId, body?.application_data);
                successResponse(reply, null, 'Seller application submitted successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to submit seller application';
                badRequestResponse(reply, message);
            }
        }
    );

    /**
     * GET /api/seller/status
     * Get seller application status (authenticated users only)
     */
    fastify.get(
        '/status',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = request.user?.userId;
                if (!userId) {
                    return unauthorizedResponse(reply);
                }

                const status = await sellerService.getApplicationStatus(userId);
                successResponse(reply, status);
            } catch (error: unknown) {
                errorResponse(reply, 'Failed to get seller status', 500, error);
            }
        }
    );
}

