import { createClient } from '@supabase/supabase-js';

export const SUPABASE_PROJECT_URL = 'https://fibqkucbquxzsmzjmgyx.supabase.co';
export const RECIPES_URL = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/recipe_storage/recipes.json`;
const SUPABASE_ANON_KEY = 'sb_publishable_KLID7d9e5MWcLeLKpr-VQA_zidMe2MZ';

export const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);