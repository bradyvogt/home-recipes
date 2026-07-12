export const parseDurationToMinutes = (iso) => {
    if (!iso || typeof iso !== 'string') return 0;
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || 0, 10);
    const minutes = parseInt(match[2] || 0, 10);
    const seconds = parseInt(match[3] || 0, 10);
    return hours * 60 + minutes + Math.round(seconds / 60);
};

export const getTextFromInstruction = (ins) => {
    if (!ins) return '';
    if (typeof ins === 'string') return ins;
    if (Array.isArray(ins)) return ins.map(getTextFromInstruction).join(' ');
    if (ins.text) return ins.text;
    return '';
};

export const parseJsonLdToRecipes = (data) => {
    const items = [];
    const candidates = [];
    if (!data) return items;

    if (Array.isArray(data)) candidates.push(...data);
    else if (data['@graph']) candidates.push(...data['@graph']);
    else if (data['@context'] && data['@type']) candidates.push(data);
    else if (data.items) candidates.push(...data.items);
    else if (Object.prototype.toString.call(data) === '[object Object]') {
        Object.values(data).forEach((v) => {
            if (v && (v['@type'] || v.name || v.recipeIngredient)) candidates.push(v);
        });
    }

    candidates.forEach((node, idx) => {
        if (!node || typeof node !== 'object') return;

        const type = node['@type'] || node.type;
        const isRecipe = (Array.isArray(type) && type.includes('Recipe')) || type === 'Recipe' || (node.name && (node.recipeIngredient || node.recipeInstructions));
        if (!isRecipe) return;

        const id = node['@id'] || node.id || `r-${idx}`;
        const name = node.name || node.headline || node.title || String(id);
        const description = node.description || '';
        const sourceType = node.sourceType || node.source_type || '';
        const sourceLink = node.sourceLink || node.source_link || node.url || '';

        const rawYield = node.recipeYield ?? node.yield ?? node.servings;
        let recipeYield = 0;
        if (typeof rawYield === 'number') recipeYield = Math.round(rawYield);
        else if (typeof rawYield === 'string') {
            const match = rawYield.match(/(\d+)/);
            recipeYield = match ? Number(match[1]) : 0;
        } else if (Array.isArray(rawYield)) {
            const joined = rawYield.join(' ');
            const match = joined.match(/(\d+)/);
            recipeYield = match ? Number(match[1]) : 0;
        }

        const prepTime = node.prepTime || node.prep_time || node.prep || '';
        const cookTime = node.cookTime || node.cook_time || node.cook || '';
        const totalTime = node.totalTime || node.total_time || node.total || '';

        const ingredients = Array.isArray(node.recipeIngredient)
            ? node.recipeIngredient
            : node.recipeIngredient
                ? [node.recipeIngredient]
                : Array.isArray(node.ingredients)
                    ? node.ingredients
                    : node.ingredients
                        ? [node.ingredients]
                        : [];

        let instructions = [];
        if (node.recipeInstructions) {
            if (Array.isArray(node.recipeInstructions)) instructions = node.recipeInstructions.map(getTextFromInstruction).filter(Boolean);
            else if (typeof node.recipeInstructions === 'string') instructions = [node.recipeInstructions];
            else if (node.recipeInstructions.text) instructions = [node.recipeInstructions.text];
        }

        const recipeCategory = Array.isArray(node.recipeCategory)
            ? node.recipeCategory
            : node.recipeCategory
                ? [node.recipeCategory]
                : node.keywords
                    ? typeof node.keywords === 'string'
                        ? node.keywords.split(',').map((s) => s.trim())
                        : node.keywords
                    : [];

        const recipeCuisine = Array.isArray(node.recipeCuisine)
            ? node.recipeCuisine
            : node.recipeCuisine
                ? [node.recipeCuisine]
                : node.cuisine
                    ? Array.isArray(node.cuisine)
                        ? node.cuisine
                        : [node.cuisine]
                    : [];

        const rating = node.aggregateRating && node.aggregateRating.ratingValue ? Number(node.aggregateRating.ratingValue) : (node.ratingValue ? Number(node.ratingValue) : 0);

        const prep_time = parseDurationToMinutes(prepTime);
        const cook_time = parseDurationToMinutes(cookTime);

        items.push({
            id,
            name,
            title: name,
            description,
            sourceType,
            sourceLink,
            recipeYield,
            prepTime,
            cookTime,
            totalTime,
            recipeIngredient: ingredients,
            recipeInstructions: instructions,
            recipeCategory,
            recipeCuisine,
            rating,

            image: node.image || '',
            servings: recipeYield,
            ingredients,
            instructions,
            categories: recipeCategory.map((c) => String(c).toLowerCase()),
            commonIngredients: [],
            prep_time,
            cook_time,
        });
    });

    return items;
};

export const formatTime = (minutes) => {
    if (!minutes) return '';
    if (minutes >= 60) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m ? `${h}h ${m}m` : `${h}h`;
    }
    return `${minutes}m`;
};

export const getTotalCookTime = (recipe) => {
    const prepMinutes = Number(recipe.prep_time) || parseDurationToMinutes(recipe.prepTime);
    const cookMinutes = Number(recipe.cook_time) || parseDurationToMinutes(recipe.cookTime);
    if (prepMinutes || cookMinutes) return prepMinutes + cookMinutes;
    return parseDurationToMinutes(recipe.totalTime);
};

export const formatIngredient = (ing) => {
    if (!ing) return '';
    if (typeof ing === 'string') return ing;
    if (ing.name) return ing.name;
    return JSON.stringify(ing);
};

export const formatCopyIngredients = (recipe) => ((recipe.recipeIngredient || recipe.ingredients) || []).map(formatIngredient).join('\n');
export const formatCopyInstructions = (recipe) => ((recipe.recipeInstructions || recipe.instructions) || []).map((s, i) => `${i + 1}. ${s}`).join('\n');

export const getProperCase = (s) => {
    if (!s) return '';
    return s
        .split(' ')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
};

/**
 * Converts a raw human-readable string into a URL-safe query parameter slug.
 * Example: "Mom's Apple Pie!  " -> "moms-apple-pie"
 */
export const nameToQueryParam = (name) => {
    if (!name) return 'unknown';

    const normalized = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    return encodeURIComponent(normalized);
};

/**
 * Converts a URL-safe query parameter slug back into a clean, capitalized display name.
 * Example: "moms-apple-pie" -> "Moms Apple Pie"
 */
export const queryParamToName = (param) => {
    if (!param) return 'Unknown';

    return decodeURIComponent(param)
        .replace(/-/g, ' ')
        .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase())
        .trim();
};
