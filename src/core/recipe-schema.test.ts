import { describe, it, expect } from 'vitest';
import { parseRecipe } from './recipe-schema';

const valid = {
  id: 'r1',
  title: 'Test',
  ingredients: ['water'],
  steps: [
    { index: 0, text: 'Boil water', durationSec: 60 },
    { index: 1, text: 'Serve' },
  ],
};

describe('parseRecipe', () => {
  it('accepts a valid recipe', () => {
    expect(parseRecipe(valid)).toEqual(valid);
  });

  it('rejects a recipe with no steps', () => {
    expect(() => parseRecipe({ ...valid, steps: [] })).toThrow();
  });

  it('rejects a missing title', () => {
    const { title: _title, ...noTitle } = valid;
    expect(() => parseRecipe(noTitle)).toThrow();
  });

  it('rejects out-of-order step indices', () => {
    const bad = { ...valid, steps: [{ index: 5, text: 'x' }] };
    expect(() => parseRecipe(bad)).toThrow();
  });

  it('rejects a non-positive durationSec', () => {
    const bad = { ...valid, steps: [{ index: 0, text: 'x', durationSec: 0 }] };
    expect(() => parseRecipe(bad)).toThrow();
  });
});
