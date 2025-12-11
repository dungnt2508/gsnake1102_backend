import { FastifyInstance } from 'fastify';
import articleRepository from '../repositories/article.repository';
import summaryRepository from '../repositories/summary.repository';

export default async function summaryRoutes(fastify: FastifyInstance) {
    // GET /api/summaries
    fastify.get('/', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const user = request.user as { userId: string };
        const { limit, offset } = request.query as { limit?: number; offset?: number };

        try {
            const articles = await articleRepository.findByUserId(user.userId, limit, offset);
            return articles;
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Failed to fetch summaries' });
        }
    });

    // GET /api/summaries/:id
    fastify.get('/:id', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { id } = request.params as { id: string };

        try {
            const article = await articleRepository.findById(id);
            if (!article) {
                return reply.status(404).send({ error: 'Article not found' });
            }

            const summary = await summaryRepository.findByArticleId(id);

            return { article, summary };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Failed to fetch summary details' });
        }
    });
}
