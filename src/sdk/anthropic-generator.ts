import Anthropic from '@anthropic-ai/sdk';
import type { RecipeGenerator } from '../adapters/content/generate';

// Real RecipeGenerator backed by the Anthropic API. This is the IO edge — the
// prompt building and JSON parsing live in the pure generateRecipe (tested);
// here we only make the call. The plugin runs entirely on the glasses client,
// so the key is shipped to the client via VITE_ANTHROPIC_API_KEY and the SDK
// runs in-browser. Keep the key to a personal/demo key with minimal scope.
export function createAnthropicGenerator(apiKey: string): RecipeGenerator {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  return async (prompt: string) => {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content[0];
    return block.type === 'text' ? block.text : '';
  };
}
