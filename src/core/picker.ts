import type { Recipe } from './recipe';

// What a row in the picker means when chosen. Recipe entries cook immediately;
// generate entries ask the LLM for a named dish; the voice entry prompts the
// user to speak a dish name. Every entry carries a `label` so MenuController can
// render and track it.
export type PickerEntry =
  | { kind: 'recipe'; label: string; recipe: Recipe }
  | { kind: 'generate'; label: string; dishName: string }
  | { kind: 'voice'; label: string };

export function buildPickerEntries(
  recipes: Recipe[],
  generateDishes: string[],
  includeVoice: boolean,
): PickerEntry[] {
  const entries: PickerEntry[] = [
    ...recipes.map((recipe): PickerEntry => ({ kind: 'recipe', label: recipe.title, recipe })),
    ...generateDishes.map(
      (dishName): PickerEntry => ({ kind: 'generate', label: `AI: ${dishName}`, dishName }),
    ),
  ];
  if (includeVoice) {
    entries.push({ kind: 'voice', label: 'Ask for a dish' });
  }
  return entries;
}
