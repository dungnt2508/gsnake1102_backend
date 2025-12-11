import openai from '../config/openai';
import personaService from './persona.service';
import { ChatMessage } from '@gsnake/shared-types';
import { Stream } from 'openai/streaming';
import { OpenAIStreamChunk, OpenAICompletionResponse } from '../types/openai';

export class LLMService {
    /**
     * Send chat completion request to OpenAI with persona injection
     * @param userId - User ID for persona injection
     * @param messages - Chat messages
     * @param stream - Whether to stream the response
     */
    async chat(
        userId: string,
        messages: ChatMessage[],
        stream: boolean = false
    ): Promise<string | Stream<OpenAIStreamChunk>> {
        // Inject user's persona into messages
        const messagesWithPersona = await personaService.injectPersona(userId, messages);

        if (stream) {
            // Return streaming response
            const streamResponse = await openai.chat.completions.create({
                model: process.env.LITELLM_DEFAULT_CHAT_MODEL || 'gpt-4-turbo-preview',
                messages: messagesWithPersona,
                stream: true,
            });

            return streamResponse as Stream<OpenAIStreamChunk>;
        } else {
            // Return regular response
            const response = await openai.chat.completions.create({
                model: process.env.LITELLM_DEFAULT_CHAT_MODEL || 'gpt-4-turbo-preview',
                messages: messagesWithPersona,
                stream: false,
            }) as OpenAICompletionResponse;

            return response.choices[0]?.message?.content || '';
        }
    }

    /**
     * Summarize article content
     * @param userId - User ID for persona injection
     * @param articleContent - Article text content
     * @param articleUrl - Article URL for context
     */
    async summarizeArticle(
        userId: string,
        articleContent: string,
        articleUrl: string
    ): Promise<string> {
        // Get user's persona for personalized summarization
        const systemPrompt = await personaService.buildSystemPrompt(userId);

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `${systemPrompt}

Additional instruction: You are summarizing an article. Provide a concise summary that highlights the key points.`,
            },
            {
                role: 'user',
                content: `Please summarize this article from ${articleUrl}:

${articleContent}

Provide a summary in a style that matches my preferences.`,
            },
        ];

        const response = await openai.chat.completions.create({
            model: process.env.LITELLM_DEFAULT_CHAT_MODEL || 'gpt-4-turbo-preview',
            messages: messages,
            stream: false,
        }) as OpenAICompletionResponse;

        return response.choices[0]?.message?.content || '';
    }

    /**
     * Generate code/tool based on user request
     * Used for tool request mailbox feature
     */
    async generateTool(
        userId: string,
        toolDescription: string,
        requirements: Record<string, any>
    ): Promise<string> {
        const systemPrompt = await personaService.buildSystemPrompt(userId);

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `${systemPrompt}

Additional instruction: You are a code generation assistant. Generate clean, well-documented, and modular code based on user requirements.`,
            },
            {
                role: 'user',
                content: `Please generate a tool/code with the following description:

${toolDescription}

Requirements:
${JSON.stringify(requirements, null, 2)}

Provide the complete implementation with comments explaining how to extend or modify it.`,
            },
        ];

        const response = await openai.chat.completions.create({
            model: process.env.LITELLM_DEFAULT_CHAT_MODEL || 'gpt-4-turbo-preview',
            messages: messages,
            stream: false,
        }) as OpenAICompletionResponse;

        return response.choices[0]?.message?.content || '';
    }
}

export default new LLMService();
