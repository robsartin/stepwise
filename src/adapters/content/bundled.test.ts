import { describe, it, expect } from 'vitest';
import { loadBundledRecipes } from './bundled';

describe('loadBundledRecipes', () => {
  it('returns at least one valid recipe', () => {
    const recipes = loadBundledRecipes();
    expect(recipes.length).toBeGreaterThan(0);
  });

  it('returns recipes that pass schema validation (sequential indices, non-empty steps)', () => {
    for (const recipe of loadBundledRecipes()) {
      expect(recipe.steps.length).toBeGreaterThan(0);
      recipe.steps.forEach((step, i) => expect(step.index).toBe(i));
    }
  });

  it('includes the carbonara recipe', () => {
    expect(loadBundledRecipes().some((r) => r.id === 'carbonara')).toBe(true);
  });
});
