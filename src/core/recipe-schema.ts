import { z } from 'zod';
import type { Recipe } from './recipe';

const stepSchema = z.object({
  index: z.number().int().nonnegative(),
  text: z.string().min(1),
  durationSec: z.number().int().positive().optional(),
  note: z.string().min(1).optional(),
});

export const recipeSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    servings: z.number().int().positive().optional(),
    ingredients: z.array(z.string().min(1)),
    steps: z.array(stepSchema).min(1),
  })
  .superRefine((recipe, ctx) => {
    recipe.steps.forEach((step, i) => {
      if (step.index !== i) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `step at position ${i} has index ${step.index}`,
          path: ['steps', i, 'index'],
        });
      }
    });
  });

export function parseRecipe(data: unknown): Recipe {
  return recipeSchema.parse(data) as Recipe;
}
