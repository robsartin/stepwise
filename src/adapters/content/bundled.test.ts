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

  it('bundles all four demo recipes', () => {
    const ids = loadBundledRecipes().map((r) => r.id);
    expect(ids).toEqual(
      expect.arrayContaining(['carbonara', 'french-press', 'grilled-cheese', 'aglio-e-olio']),
    );
  });

  it('gives every recipe a unique id and a non-empty title', () => {
    const recipes = loadBundledRecipes();
    const ids = recipes.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    recipes.forEach((r) => expect(r.title.length).toBeGreaterThan(0));
  });
});
