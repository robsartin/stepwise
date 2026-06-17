import { describe, it, expect, vi } from 'vitest';
import { generateRecipe } from './generate';

const validJson = JSON.stringify({
  id: 'omelette',
  title: 'Omelette',
  ingredients: ['2 eggs', 'butter'],
  steps: [
    { index: 0, text: 'Beat the eggs.' },
    { index: 1, text: 'Cook in butter.', durationSec: 120 },
  ],
});

describe('generateRecipe', () => {
  it('calls the generator with the dish name and returns a validated recipe', async () => {
    const generator = vi.fn().mockResolvedValue(validJson);
    const recipe = await generateRecipe('omelette', generator);
    expect(generator).toHaveBeenCalledWith(expect.stringContaining('omelette'));
    expect(recipe.title).toBe('Omelette');
    expect(recipe.steps).toHaveLength(2);
  });

  it('strips markdown code fences before parsing', async () => {
    const generator = vi.fn().mockResolvedValue('```json\n' + validJson + '\n```');
    const recipe = await generateRecipe('omelette', generator);
    expect(recipe.id).toBe('omelette');
  });

  it('throws when the model returns invalid JSON', async () => {
    const generator = vi.fn().mockResolvedValue('not json');
    await expect(generateRecipe('omelette', generator)).rejects.toThrow();
  });

  it('throws when the model returns a schema-invalid recipe', async () => {
    const generator = vi.fn().mockResolvedValue(JSON.stringify({ id: 'x', title: 'x' }));
    await expect(generateRecipe('omelette', generator)).rejects.toThrow();
  });
});
