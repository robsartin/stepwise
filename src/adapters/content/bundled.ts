import type { Recipe } from '../../core/recipe';
import { parseRecipe } from '../../core/recipe-schema';
import carbonara from '../../content/recipes/carbonara.json';
import frenchPress from '../../content/recipes/french-press.json';
import grilledCheese from '../../content/recipes/grilled-cheese.json';
import aglioEOlio from '../../content/recipes/aglio-e-olio.json';

const RAW: unknown[] = [carbonara, frenchPress, grilledCheese, aglioEOlio];

export function loadBundledRecipes(): Recipe[] {
  return RAW.map(parseRecipe);
}
