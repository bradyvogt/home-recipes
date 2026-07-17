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

export const getRecipesUrl = (dataSourceId, options = {}) => {
    const baseUrl = !dataSourceId
        ? DEFAULT_RECIPES_URL
        : `${SUPABASE_STORAGE_URL}/${getStorageFileName(dataSourceId)}`;

    if (!options?.bustCache) {
        return baseUrl;
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}t=${Date.now()}`;
};

export const fetchRecipesData = async (dataSourceId, options = {}) => {
    const response = await fetch(getRecipesUrl(dataSourceId, options));

    if (!response.ok) {
        throw new Error('Failed to fetch recipes from server.');
    }

    return response.json();
};

export const STORAGE_DATA_SOURCE_KEY = 'selected-data-source';

export const getStoredDataSourceId = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    return window.localStorage.getItem(STORAGE_DATA_SOURCE_KEY) || '';
};

export const setStoredDataSourceId = (dataSourceId) => {
    if (typeof window === 'undefined') {
        return;
    }

    if (!dataSourceId) {
        window.localStorage.removeItem(STORAGE_DATA_SOURCE_KEY);
        return;
    }

    window.localStorage.setItem(STORAGE_DATA_SOURCE_KEY, dataSourceId);
};

export const listDataSourceFiles = async () => {
    const { data, error } = await supabase.storage.from('recipe_storage').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
        throw error;
    }

    return (data || [])
        .map((item) => item.name)
        .filter((name) => typeof name === 'string' && name.endsWith('.json'))
        .map((name) => name.replace(/\.json$/i, ''))
        .filter(Boolean);
};

const SUPABASE_ANON_KEY = 'sb_publishable_KLID7d9e5MWcLeLKpr-VQA_zidMe2MZ';

export const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);