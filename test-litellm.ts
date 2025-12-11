
import dotenv from 'dotenv';
import path from 'path';
import OpenAI from 'openai';

// Load env before importing service
dotenv.config({ path: path.join(__dirname, '.env') });

async function testLiteLLM() {
    console.log('Testing LiteLLM Connection (Direct)...');
    console.log('API Key:', process.env.LITELLM_API_KEY ? 'Set' : 'Missing');
    console.log('Base URL:', process.env.LITELLM_BASE_URL);
    console.log('Model:', process.env.LITELLM_DEFAULT_CHAT_MODEL);

    const openai = new OpenAI({
        apiKey: process.env.LITELLM_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.LITELLM_BASE_URL || 'https://api.openai.com/v1',
    });

    try {
        const response = await openai.chat.completions.create({
            model: process.env.LITELLM_DEFAULT_CHAT_MODEL || 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Hello, are you working?' }],
            stream: false,
        });
        console.log('✅ Success! Response:', response.choices[0]?.message?.content);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testLiteLLM();
