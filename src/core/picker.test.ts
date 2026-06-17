import { describe, it, expect } from 'vitest';
import { buildPickerEntries } from './picker';
import type { Recipe } from './recipe';

const recipes: Recipe[] = [
  { id: 'a', title: 'Alpha', ingredients: [], steps: [{ index: 0, text: 'x' }] },
  { id: 'b', title: 'Bravo', ingredients: [], steps: [{ index: 0, text: 'y' }] },
];

describe('buildPickerEntries', () => {
  it('turns recipes into recipe entries labeled by title', () => {
    const entries = buildPickerEntries(recipes, [], false);
    expect(entries).toEqual([
      { kind: 'recipe', label: 'Alpha', recipe: recipes[0] },
      { kind: 'recipe', label: 'Bravo', recipe: recipes[1] },
    ]);
  });

  it('adds generate entries after the recipes, labeled "AI: <dish>"', () => {
    const entries = buildPickerEntries(recipes, ['Shakshuka', 'Pad Thai'], false);
    expect(entries.slice(2)).toEqual([
      { kind: 'generate', label: 'AI: Shakshuka', dishName: 'Shakshuka' },
      { kind: 'generate', label: 'AI: Pad Thai', dishName: 'Pad Thai' },
    ]);
  });

  it('appends a voice entry last when voice is enabled', () => {
    const entries = buildPickerEntries(recipes, ['Shakshuka'], true);
    expect(entries[entries.length - 1]).toEqual({ kind: 'voice', label: 'Ask for a dish' });
  });

  it('omits the voice entry when voice is disabled', () => {
    const entries = buildPickerEntries(recipes, [], false);
    expect(entries.some((e) => e.kind === 'voice')).toBe(false);
  });
});
