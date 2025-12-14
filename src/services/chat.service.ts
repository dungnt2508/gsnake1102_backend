import openai from '@/config/openai';
import pool from '@/config/database';
import { productService } from './product.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RecommendationResult {
  productId: string;
  title: string;
  match: number;
  reason: string;
}

interface ChatRecommendationResponse {
  understanding: string;
  recommendations: RecommendationResult[];
  clarifyingQuestion?: string;
  suggestPills: string[];
}

export class ChatService {
  /**
   * Get product recommendations based on user query using LLM
   */
  async getRecommendations(
    query: string,
    limit: number = 3
  ): Promise<ChatRecommendationResponse> {
    try {
      // Fetch all available products for context
      const allProducts = await productService.getAllProducts();

      // Build product context for LLM
      const productContext = allProducts
        .slice(0, 50) // Limit to 50 products for token efficiency
        .map(
          (p) =>
            `- ${p.title} (${p.tags?.join(', ') || 'General'}): ${p.description}`
        )
        .join('\n');

      const systemPrompt = `You are a helpful n8n workflow recommendation assistant. Your task is to understand user's automation needs and recommend the most suitable workflows.

Available workflows:
${productContext}

Respond in JSON format with the following structure:
{
  "understanding": "brief explanation of what the user wants",
  "recommendations": [
    { "productId": "...", "title": "...", "match": 95, "reason": "why this matches" }
  ],
  "clarifyingQuestion": "optional question to better understand needs",
  "suggestPills": ["tag1", "tag2", "tag3"]
}

Important:
- Be concise and helpful
- Match recommendations to actual workflows in the list
- Provide match percentage (0-100)
- Suggest relevant tags for quick filtering`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: query,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      // Parse JSON response
      const result = JSON.parse(content) as ChatRecommendationResponse;

      // Validate and enrich recommendations with actual product IDs
      const enrichedRecommendations = result.recommendations
        .slice(0, limit)
        .map((rec) => {
          const product = allProducts.find(
            (p) =>
              p.title.toLowerCase() === rec.title.toLowerCase() ||
              p.id === rec.productId
          );
          return {
            ...rec,
            productId: product?.id || rec.productId,
          };
        })
        .filter((rec) => allProducts.some((p) => p.id === rec.productId));

      return {
        ...result,
        recommendations: enrichedRecommendations,
      };
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw new Error('Failed to get recommendations');
    }
  }

  /**
   * Save chat message to database (for future analytics)
   */
  async saveChatMessage(
    conversationId: string,
    userId: string | null,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, any>
  ) {
    try {
      await pool.query(
        `INSERT INTO chat_messages (id, conversation_id, user_id, role, content, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          `msg_${Date.now()}_${Math.random()}`,
          conversationId,
          userId,
          role,
          content,
          metadata ? JSON.stringify(metadata) : null,
        ]
      );
    } catch (error) {
      console.error('Error saving chat message:', error);
      // Don't throw - chat history is not critical
    }
  }

  /**
   * Get chat conversation history
   */
  async getChatHistory(conversationId: string) {
    try {
      const result = await pool.query(
        `SELECT id, role, content, metadata, created_at
         FROM chat_messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC
         LIMIT 50`,
        [conversationId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        timestamp: row.created_at,
      }));
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  /**
   * Capture lead email from chat
   */
  async captureLead(conversationId: string, email: string) {
    try {
      await pool.query(
        `INSERT INTO chat_messages (id, conversation_id, role, content, metadata, created_at)
         VALUES ($1, $2, 'system', 'Lead captured', $3, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          `lead_${Date.now()}`,
          conversationId,
          JSON.stringify({ email, type: 'lead_capture' }),
        ]
      );

      // TODO: Send email to sales team or store in CRM
      return { success: true, email };
    } catch (error) {
      console.error('Error capturing lead:', error);
      throw new Error('Failed to capture lead');
    }
  }

  /**
   * Get popular categories for quick suggestions
   */
  async getPopularCategories(): Promise<string[]> {
    try {
      const products = await productService.getAllProducts();
      const tagFrequency = new Map<string, number>();

      products.forEach((product) => {
        product.tags?.forEach((tag) => {
          tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
        });
      });

      return Array.from(tagFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);
    } catch (error) {
      console.error('Error getting popular categories:', error);
      return [
        'Email Marketing',
        'CRM',
        'Social Media',
        'Data Sync',
        'Integration',
      ];
    }
  }

  /**
   * Search products with semantic similarity (simple keyword matching for now)
   */
  async searchProductsByQuery(query: string, limit: number = 5) {
    try {
      const products = await productService.getAllProducts();
      const queryLower = query.toLowerCase();

      // Simple relevance scoring
      const scored = products.map((product) => {
        let score = 0;

        // Title match (highest weight)
        if (product.title.toLowerCase().includes(queryLower)) score += 100;

        // Description match
        if (
          product.description &&
          product.description.toLowerCase().includes(queryLower)
        ) {
          score += 50;
        }

        // Tag match
        product.tags?.forEach((tag) => {
          if (tag.toLowerCase().includes(queryLower)) score += 30;
        });

        return { ...product, relevanceScore: score };
      });

      return scored
        .filter((p) => p.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }
}

export const chatService = new ChatService();

