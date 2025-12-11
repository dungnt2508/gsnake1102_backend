import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.LITELLM_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.LITELLM_BASE_URL || 'https://api.openai.com/v1',
});

export default openai;
