import test from 'node:test';
import assert from 'node:assert/strict';

import { parseJsonLdToRecipes, getRecipeDisplayName } from './helpers.js';

test('parsed recipes expose a searchable display name and title alias', () => {
  const recipes = parseJsonLdToRecipes([
    {
      name: 'Beef Enchiladas',
      recipeYield: 6,
      prepTime: 'PT30M',
      cookTime: 'PT30M',
      recipeIngredient: ['beef'],
      recipeInstructions: ['cook it'],
      recipeCategory: ['Main Dish'],
      recipeCuisine: ['Mexican'],
      totalTime: 'PT1H',
    },
  ]);

  assert.equal(recipes.length, 1);
  assert.equal(recipes[0].name, 'Beef Enchiladas');
  assert.equal(getRecipeDisplayName(recipes[0]), 'Beef Enchiladas');
  assert.equal(recipes[0].categories[0], 'main dish');
});
