import personaRepository from '../repositories/persona.repository';
import { Persona, CreatePersonaInput, UpdatePersonaInput, ChatMessage } from '@gsnake/shared-types';

export class PersonaService {
    /**
     * Get user's persona
     */
    async getPersona(userId: string): Promise<Persona | null> {
        return await personaRepository.findByUserId(userId);
    }

    /**
     * Create persona for user
     */
    async createPersona(data: CreatePersonaInput): Promise<Persona> {
        // Check if persona already exists
        const existing = await personaRepository.findByUserId(data.user_id);
        if (existing) {
            throw new Error('Persona already exists for this user');
        }

        return await personaRepository.create(data);
    }

    /**
     * Update persona
     */
    async updatePersona(userId: string, data: UpdatePersonaInput): Promise<Persona> {
        const updated = await personaRepository.update(userId, data);
        if (!updated) {
            throw new Error('Persona not found');
        }
        return updated;
    }

    /**
     * Delete persona
     */
    async deletePersona(userId: string): Promise<void> {
        const deleted = await personaRepository.delete(userId);
        if (!deleted) {
            throw new Error('Persona not found');
        }
    }

    /**
     * Build system prompt with persona injection
     * This is the core feature - injecting user's persona into LLM prompts
     */
    async buildSystemPrompt(userId: string): Promise<string> {
        const persona = await personaRepository.findByUserId(userId);

        if (!persona) {
            // Default system prompt if no persona exists
            return 'You are a helpful AI assistant.';
        }

        // Build personalized system prompt
        const prompt = `You are a helpful AI assistant. 

Communication Style:
- Language style: ${persona.language_style}
- Tone: ${persona.tone}

User Interests:
The user is particularly interested in: ${persona.topics_interest.join(', ')}.

Instructions:
- Respond in a ${persona.language_style} manner with a ${persona.tone} tone
- When possible, relate your answers to the user's interests
- Be helpful, informative, and engaging
- Adapt your communication style to match the user's preferences
`;

        return prompt;
    }

    /**
     * Inject persona into chat messages
     * Adds system message with persona at the beginning
     */
    async injectPersona(userId: string, messages: ChatMessage[]): Promise<ChatMessage[]> {
        const systemPrompt = await this.buildSystemPrompt(userId);

        // Check if there's already a system message
        const hasSystemMessage = messages.some(msg => msg.role === 'system');

        if (hasSystemMessage) {
            // Replace existing system message with persona-injected one
            return messages.map(msg =>
                msg.role === 'system'
                    ? { role: 'system', content: systemPrompt }
                    : msg
            );
        } else {
            // Add system message at the beginning
            return [
                { role: 'system', content: systemPrompt },
                ...messages
            ];
        }
    }
}

export default new PersonaService();
