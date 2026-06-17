import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { generateRecipe } from './generate';

const run = process.env.RUN_LIVE_API === '1';

describe.runIf(run)('generateRecipe (live Anthropic)', () => {
  it('generates a real recipe from a dish name', async () => {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const recipe = await generateRecipe('grilled cheese sandwich', async (prompt) => {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      const block = msg.content[0];
      return block.type === 'text' ? block.text : '';
    });
    expect(recipe.steps.length).toBeGreaterThan(1);
  }, 30_000);
});
