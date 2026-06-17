import type { Recipe } from '../../core/recipe';
import { parseRecipe } from '../../core/recipe-schema';
import carbonara from '../../content/recipes/carbonara.json';

const RAW: unknown[] = [carbonara];

export function loadBundledRecipes(): Recipe[] {
  return RAW.map(parseRecipe);
}
