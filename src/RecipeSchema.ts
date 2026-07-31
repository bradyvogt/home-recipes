import { z } from 'zod';

export const SchemaOrgRecipeSchema = z.object({
  name: z.string().optional().default(''),
  description: z.string().optional().default(''),
  sourceType: z.string().optional().default(''),
  sourceLink: z.string().optional().default(''),
  recipeYield: z.number().int().optional().default(0),
  prepTime: z.string().optional().default(''),
  cookTime: z.string().optional().default(''),
  totalTime: z.string().optional().default(''),
  recipeIngredient: z.array(z.string()).optional().default([]),
  recipeInstructions: z.array(z.string()).optional().default([]),
  recipeCategory: z.array(z.string()).optional().default([]),
  recipeCuisine: z.array(z.string()).optional().default([]),
});

export type SchemaOrgRecipe = z.infer<typeof SchemaOrgRecipeSchema>;
