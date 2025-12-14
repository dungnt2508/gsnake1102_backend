import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { chatService } from '@/services/chat.service';
import { validate } from '@/middleware/validation.middleware';
import { successResponse, errorResponse } from '@/utils/response';
import { z } from 'zod';

export default async function chatRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/chat/recommendations
   * Get product recommendations based on user query
   */
  fastify.post<{ Body: { query: string; limit?: number } }>(
    '/recommendations',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { query, limit = 3 } = request.body;

        if (!query || typeof query !== 'string' || !query.trim()) {
          return errorResponse(reply, 'Query is required', 400);
        }

        const recommendations = await chatService.getRecommendations(
          query,
          Math.min(limit || 3, 10)
        );

        return successResponse(reply, recommendations);
      } catch (error) {
        console.error('Error in recommendations endpoint:', error);
        return errorResponse(
          reply,
          'Failed to get recommendations',
          500
        );
      }
    }
  );

  /**
   * POST /api/chat/message
   * Send chat message and get response
   */
  fastify.post<{ Body: { message: string; conversationId?: string } }>(
    '/message',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { message, conversationId } = request.body;

        if (!message || typeof message !== 'string' || !message.trim()) {
          return errorResponse(reply, 'Message is required', 400);
        }

        const userId = (request as any).user?.id || null;

        // Save user message
        if (conversationId) {
          await chatService.saveChatMessage(
            conversationId,
            userId,
            'user',
            message
          );
        }

        // Get recommendations
        const recommendations = await chatService.getRecommendations(
          message,
          3
        );

        // Save assistant response
        if (conversationId) {
          await chatService.saveChatMessage(
            conversationId,
            userId,
            'assistant',
            'Found recommendations based on your query',
            { recommendations }
          );
        }

        return successResponse(reply, recommendations);
      } catch (error) {
        console.error('Error in message endpoint:', error);
        return errorResponse(reply, 'Failed to process message', 500);
      }
    }
  );

  /**
   * GET /api/chat/history/:conversationId
   * Get chat history
   */
  fastify.get<{ Params: { conversationId: string } }>(
    '/history/:conversationId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { conversationId } = request.params;

        const history = await chatService.getChatHistory(conversationId);

        return successResponse(reply, history);
      } catch (error) {
        console.error('Error fetching chat history:', error);
        return errorResponse(
          reply,
          'Failed to fetch chat history',
          500
        );
      }
    }
  );

  /**
   * POST /api/chat/lead
   * Capture email for follow-up
   */
  fastify.post<{ Body: { email: string; conversationId?: string } }>(
    '/lead',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email, conversationId } = request.body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
          return errorResponse(reply, 'Valid email is required', 400);
        }

        const result = await chatService.captureLead(
          conversationId || `conv_${Date.now()}`,
          email
        );

        return successResponse(reply, result);
      } catch (error) {
        console.error('Error capturing lead:', error);
        return errorResponse(reply, 'Failed to capture lead', 500);
      }
    }
  );

  /**
   * GET /api/chat/categories
   * Get popular categories for quick suggestions
   */
  fastify.get('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const categories = await chatService.getPopularCategories();

      return successResponse(reply, categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return errorResponse(
        reply,
        'Failed to fetch categories',
        500
      );
    }
  });

  /**
   * POST /api/chat/search
   * Search products based on query
   */
  fastify.post<{ Body: { query: string; limit?: number } }>(
    '/search',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { query, limit = 5 } = request.body;

        if (!query || typeof query !== 'string' || !query.trim()) {
          return errorResponse(reply, 'Query is required', 400);
        }

        const results = await chatService.searchProductsByQuery(
          query,
          Math.min(limit || 5, 20)
        );

        return successResponse(reply, results);
      } catch (error) {
        console.error('Error searching products:', error);
        return errorResponse(
          reply,
          'Failed to search products',
          500
        );
      }
    }
  );
}
