import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import reviewService from '../services/review.service';
import { validate, createReviewSchema, updateReviewSchema } from '../middleware/validation.middleware';
import { successResponse, createdResponse, errorResponse, unauthorizedResponse, badRequestResponse, notFoundResponse } from '../utils/response';
import { requireAdmin } from '../middleware/auth.middleware';
import { Review } from '@gsnake/shared-types';

function mapReview(review: Review) {
    return {
        id: review.id,
        productId: review.product_id,
        userId: review.user_id,
        rating: review.rating,
        content: review.content,
        status: review.status,
        createdAt: review.created_at instanceof Date ? review.created_at.toISOString() : review.created_at,
        updatedAt: review.updated_at instanceof Date ? review.updated_at.toISOString() : review.updated_at,
    };
}

export default async function reviewRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/reviews/product/:productId
     * Public: list approved reviews for a product
     */
    fastify.get('/product/:productId', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { productId } = request.params as { productId: string };
            const query = request.query as { limit?: string; offset?: string };
            const limit = query.limit ? parseInt(query.limit, 10) : 50;
            const offset = query.offset ? parseInt(query.offset, 10) : 0;

            const result = await reviewService.getProductReviews(productId, limit, offset);
            successResponse(reply, {
                reviews: result.reviews.map(mapReview),
                total: result.total,
                limit,
                offset,
            });
        } catch (error: unknown) {
            errorResponse(reply, 'Failed to get reviews', 500, error);
        }
    });

    /**
     * POST /api/reviews
     * Auth: user creates a review (pending)
     */
    fastify.post('/', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.user?.userId;
            if (!userId) return unauthorizedResponse(reply);

            const data = validate(createReviewSchema, request.body);
            const review = await reviewService.createReview(userId, {
                ...data,
                user_id: userId,
            });
            createdResponse(reply, { review: mapReview(review) }, 'Review created (pending approval)');
        } catch (error: unknown) {
            const { NotFoundError, AuthorizationError, DomainError } = await import('../shared/errors');
            if (error instanceof NotFoundError) return notFoundResponse(reply, error.message);
            if (error instanceof AuthorizationError) return unauthorizedResponse(reply, error.message);
            if (error instanceof DomainError) return badRequestResponse(reply, error.message);
            errorResponse(reply, 'Failed to create review', 500, error);
        }
    });

    /**
     * PUT /api/reviews/:id
     * Auth: user updates own review (re-pending)
     */
    fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.user?.userId;
            if (!userId) return unauthorizedResponse(reply);

            const { id } = request.params as { id: string };
            const data = validate(updateReviewSchema, request.body);
            const review = await reviewService.updateReview(id, userId, data);
            successResponse(reply, { review: mapReview(review) }, 'Review updated (pending approval)');
        } catch (error: unknown) {
            const { NotFoundError, AuthorizationError, DomainError } = await import('../shared/errors');
            if (error instanceof NotFoundError) return notFoundResponse(reply, error.message);
            if (error instanceof AuthorizationError) return unauthorizedResponse(reply, error.message);
            if (error instanceof DomainError) return badRequestResponse(reply, error.message);
            errorResponse(reply, 'Failed to update review', 500, error);
        }
    });

    /**
     * DELETE /api/reviews/:id
     * Auth: user deletes own review
     */
    fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const userId = request.user?.userId;
            if (!userId) return unauthorizedResponse(reply);

            const { id } = request.params as { id: string };
            await reviewService.deleteReview(id, userId);
            successResponse(reply, null, 'Review deleted');
        } catch (error: unknown) {
            const { NotFoundError, AuthorizationError, DomainError } = await import('../shared/errors');
            if (error instanceof NotFoundError) return notFoundResponse(reply, error.message);
            if (error instanceof AuthorizationError) return unauthorizedResponse(reply, error.message);
            if (error instanceof DomainError) return badRequestResponse(reply, error.message);
            errorResponse(reply, 'Failed to delete review', 500, error);
        }
    });

    /**
     * POST /api/reviews/:id/approve
     * Admin approves review
     */
    fastify.post('/:id/approve', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await fastify.authenticate(request, reply);
            await requireAdmin(request, reply);

            const { id } = request.params as { id: string };
            const review = await reviewService.adminApprove(id, request.user!.userId);
            successResponse(reply, { review: mapReview(review) }, 'Review approved');
        } catch (error: unknown) {
            const { NotFoundError, DomainError } = await import('../shared/errors');
            if (error instanceof NotFoundError) return notFoundResponse(reply, error.message);
            if (error instanceof DomainError) return badRequestResponse(reply, error.message);
            errorResponse(reply, 'Failed to approve review', 500, error);
        }
    });

    /**
     * POST /api/reviews/:id/reject
     * Admin rejects review
     */
    fastify.post('/:id/reject', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await fastify.authenticate(request, reply);
            await requireAdmin(request, reply);

            const { id } = request.params as { id: string };
            const review = await reviewService.adminReject(id, request.user!.userId);
            successResponse(reply, { review: mapReview(review) }, 'Review rejected');
        } catch (error: unknown) {
            const { NotFoundError, DomainError } = await import('../shared/errors');
            if (error instanceof NotFoundError) return notFoundResponse(reply, error.message);
            if (error instanceof DomainError) return badRequestResponse(reply, error.message);
            errorResponse(reply, 'Failed to reject review', 500, error);
        }
    });
}


