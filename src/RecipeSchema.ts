import { z } from 'zod';

export const SchemaOrgRecipeSchema = z.object({
  name: z.string().describe('The title of the recipe'),
  description: z.string().describe('A brief summary or catchphrase introducing the dish'),
  sourceType: z.string().describe('Image, freeform text, or URL'),
  sourceLink: z.string().describe('URL of the original recipe if from web source'),
  recipeYield: z.number().int().describe('Total number of servings'),
  prepTime: z.string().describe('Preparation duration formatted as an ISO 8601 string, like PT15M'),
  cookTime: z.string().describe('Cooking duration formatted as an ISO 8601 string, like PT30M'),
  totalTime: z.string().describe('Total elapsed duration formatted as an ISO 8601 string, like PT45M'),
  recipeIngredient: z.array(z.string()).describe('A list of raw ingredients including their specific measurement amounts and notes'),
  recipeInstructions: z.array(z.string()).describe('An ordered collection of HowToStep objects required to successfully execute the recipe'),
  recipeCategory: z.array(z.string()).describe('The culinary category classification this recipe fits under (e.g. main dish, side dish, breakfast, dessert)'),
  recipeCuisine: z.array(z.string()).describe('The specific country or region of culinary origin (e.g., American, Italian)'),
});

export type SchemaOrgRecipe = z.infer<typeof SchemaOrgRecipeSchema>;
