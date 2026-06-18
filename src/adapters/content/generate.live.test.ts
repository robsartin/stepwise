import { describe, it, expect } from 'vitest';
import { generateRecipe } from './generate';
import { createAnthropicGenerator } from '../../sdk/anthropic-generator';

const run = process.env.RUN_LIVE_API === '1';

describe.runIf(run)('generateRecipe (live Anthropic)', () => {
  it('generates a real recipe from a dish name', async () => {
    const generator = createAnthropicGenerator(process.env.ANTHROPIC_API_KEY ?? '');
    const recipe = await generateRecipe('grilled cheese sandwich', generator);
    expect(recipe.steps.length).toBeGreaterThan(1);
  }, 30_000);
});
