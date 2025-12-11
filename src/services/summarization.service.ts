import openai from '../config/openai';
import personaService from './persona.service';
import { ChatMessage } from '@gsnake/shared-types';

export class SummarizationService {
    /**
     * Generate summary, insights, and data points from content
     */
    async summarize(
        userId: string,
        content: string,
        sourceInfo: string
    ): Promise<{ summary: string; insights: any[]; data_points: any[] }> {
        const systemPrompt = await personaService.buildSystemPrompt(userId);

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `${systemPrompt}

You are an expert analyst. Your task is to analyze the provided content and extract:
1. A concise summary.
2. Key insights (as a list of strings).
3. Important data points or statistics (as a list of strings).

Return the result strictly in JSON format:
{
  "summary": "string",
  "insights": ["string", "string"],
  "data_points": ["string", "string"]
}`,
            },
            {
                role: 'user',
                content: `Analyze this content from ${sourceInfo}:

${content.substring(0, 15000)} -- Truncated if too long

Return JSON only.`,
            },
        ];

        try {
            const response = await openai.chat.completions.create({
                model: process.env.LITELLM_DEFAULT_CHAT_MODEL || 'gpt-4-turbo-preview',
                messages: messages,
                response_format: { type: 'json_object' },
                temperature: 0.3,
            });

            const result = JSON.parse(response.choices[0]?.message?.content || '{}');
            return {
                summary: result.summary || 'No summary generated.',
                insights: result.insights || [],
                data_points: result.data_points || [],
            };
        } catch (error) {
            console.error('Error generating summary:', error);
            return {
                summary: 'Failed to generate summary.',
                insights: [],
                data_points: [],
            };
        }
    }
}

export default new SummarizationService();
