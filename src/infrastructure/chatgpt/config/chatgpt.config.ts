import { registerAs } from '@nestjs/config';

export default registerAs('chatgpt', () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('⚠️ OPENAI_API_KEY não foi definido no .env');
  }

  const timeoutEnv = process.env.OPENAI_TIMEOUT_MS;
  const timeoutMs  = timeoutEnv
    ? parseInt(timeoutEnv, 10)
    : 30000; 

  return {
    apiKey,                            
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    timeoutMs,                         
  };
});
