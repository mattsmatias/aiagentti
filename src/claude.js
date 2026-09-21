import Anthropic from '@anthropic-ai/sdk';

let client;
export async function ask(prompt, maxTokens = 16000) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY puuttuu .env-tiedostosta');
  client ??= new Anthropic();
  const msg = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}
