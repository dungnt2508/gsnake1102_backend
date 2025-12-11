/**
 * OpenAI Stream Response Types
 */
export interface OpenAIStreamChunk {
    choices: Array<{
        delta?: {
            content?: string;
        };
        message?: {
            content?: string;
        };
    }>;
}

export interface OpenAICompletionResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

