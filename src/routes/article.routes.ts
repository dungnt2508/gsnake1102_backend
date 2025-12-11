import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import articleService from '../services/article.service';
import { validate, createArticleSchema } from '../middleware/validation.middleware';
import { sanitizeUrl } from '../utils/sanitize';
import { successResponse, createdResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse } from '../utils/response';
import { SourceType } from '@gsnake/shared-types';

export default async function articleRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/articles
     * Get all articles for current user
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

                const articles = await articleService.getUserArticles(userId, Number(limit), Number(offset));

                successResponse(reply, { articles });
            } catch (error: unknown) {
                errorResponse(reply, 'Failed to get articles', 500, error);
            }
        }
    );

    /**
     * GET /api/articles/:id
     * Get specific article by ID
     */
    fastify.get(
        '/:id',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { id } = request.params as { id: string };
                const article = await articleService.getArticle(id);

                if (!article) {
                    return notFoundResponse(reply, 'Article not found');
                }

                successResponse(reply, { article });
            } catch (error: unknown) {
                errorResponse(reply, 'Failed to get article', 500, error);
            }
        }
    );

    /**
     * POST /api/articles
     * Submit article URL for summarization
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

                const data = validate(createArticleSchema, request.body);
                
                // Sanitize URL if provided
                if (data.url) {
                    data.url = sanitizeUrl(data.url);
                }
                if (data.source_value && (data.source_type === 'url' || !data.source_type)) {
                    data.source_value = sanitizeUrl(data.source_value);
                }
                
                const article = await articleService.submitArticle({
                    ...data,
                    user_id: userId,
                    source_type: data.source_type as SourceType,
                    source_value: data.source_value as string,
                });

                createdResponse(reply, { article }, 'Article submitted for summarization');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to submit article';
                badRequestResponse(reply, message);
            }
        }
    );

    /**
     * POST /api/articles/callback/:id
     * Webhook callback from n8n after article summarization
     * This is called by n8n workflow after processing
     */
    fastify.post('/callback/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as { id: string };
            const { summary, title, source, success } = request.body as {
                summary?: string;
                title?: string;
                source?: string;
                success: boolean;
            };

            if (!success) {
                await articleService.markArticleFailed(id);
                return reply.send({ success: true, message: 'Article marked as failed' });
            }

            if (!summary) {
                return badRequestResponse(reply, 'Summary is required');
            }

            const article = await articleService.updateArticleSummary(id, summary, title, source);

            successResponse(reply, { article }, 'Article updated successfully');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update article';
            badRequestResponse(reply, message);
        }
    });

    /**
     * DELETE /api/articles/:id
     * Delete article
     */
    fastify.delete(
        '/:id',
        { preHandler: [fastify.authenticate] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { id } = request.params as { id: string };
                await articleService.deleteArticle(id);

                successResponse(reply, null, 'Article deleted successfully');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to delete article';
                badRequestResponse(reply, message);
            }
        }
    );
}
