import type { Recipe } from '../../core/recipe';
import { parseRecipe } from '../../core/recipe-schema';

export type RecipeGenerator = (prompt: string) => Promise<string>;

function buildPrompt(dishName: string): string {
  return [
    `Create a cooking recipe for "${dishName}".`,
    'Respond with ONLY a JSON object, no prose, matching this shape:',
    '{ "id": string, "title": string, "servings"?: number, "ingredients": string[],',
    '  "steps": [{ "index": number, "text": string, "durationSec"?: number, "note"?: string }] }',
    'Steps must be ordered with index starting at 0 and incrementing by 1.',
    'Set durationSec (in seconds) only on steps that involve waiting (boil, simmer, bake).',
  ].join('\n');
}

function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

export async function generateRecipe(
  dishName: string,
  generator: RecipeGenerator,
): Promise<Recipe> {
  const raw = await generator(buildPrompt(dishName));
  const parsed = JSON.parse(stripFences(raw));
  return parseRecipe(parsed);
}
