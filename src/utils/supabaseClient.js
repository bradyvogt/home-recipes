import { createClient } from '@supabase/supabase-js';

export const SUPABASE_PROJECT_URL = 'https://fibqkucbquxzsmzjmgyx.supabase.co';
export const SUPABASE_STORAGE_URL = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/recipe_storage`;
export const DEFAULT_RECIPES_URL = `${SUPABASE_STORAGE_URL}/recipes.json`;

export const getStorageFileName = (dataSourceId) => {
    if (!dataSourceId) {
        return 'recipes.json';
    }
    return `${dataSourceId}.json`;
};

export const getRecipesUrl = (dataSourceId) => {
    if (!dataSourceId) {
        return DEFAULT_RECIPES_URL;
    }
    return `${SUPABASE_STORAGE_URL}/${getStorageFileName(dataSourceId)}`;
};

const SUPABASE_ANON_KEY = 'sb_publishable_KLID7d9e5MWcLeLKpr-VQA_zidMe2MZ';

export const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);