export const parseDurationToMinutes = (iso) => {
    if (!iso || typeof iso !== 'string') return 0;
    // Supports PT#H#M, PT#M, PT#S
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
    if (ins.text) return ins.text;
    if (Array.isArray(ins)) return ins.map(getTextFromInstruction).join(' ');
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

    // Also accept an object keyed by id->obj
    if (Object.prototype.toString.call(data) === '[object Object]' && !candidates.length) {
        Object.values(data).forEach(v => { if (v && (v['@type'] || v.name)) candidates.push(v); });
    }

    candidates.forEach((node, idx) => {
        const type = node['@type'] || node['type'] || node['@type'];
        const isRecipe = (Array.isArray(type) && type.includes('Recipe')) || type === 'Recipe' || (node.name && (node.recipeIngredient || node.recipeInstructions));
        if (!isRecipe) return;

        const id = node['@id'] || node['id'] || `r-${idx}`;
        const title = node.name || node.headline || node.title || String(id);
        const ingredients = node.recipeIngredient || node.ingredients || [];
        let instructions = [];
        if (node.recipeInstructions) {
            if (Array.isArray(node.recipeInstructions)) instructions = node.recipeInstructions.map(getTextFromInstruction);
            else if (typeof node.recipeInstructions === 'string') instructions = [node.recipeInstructions];
            else if (node.recipeInstructions.text) instructions = [node.recipeInstructions.text];
        }

        const prep_time = parseDurationToMinutes(node.prepTime || node.prep_time || node.prep);
        const cook_time = parseDurationToMinutes(node.cookTime || node.cook_time || node.cook);
        const servingsRaw = node.recipeYield || node.yield || node.servings || node.recipeYield;
        let servings = servingsRaw;
        if (typeof servingsRaw === 'string') {
            const m = servingsRaw.match(/(\d+)/);
            servings = m ? m[1] : servingsRaw;
        }

        let categories = [];
        if (node.recipeCategory) categories = Array.isArray(node.recipeCategory) ? node.recipeCategory : [node.recipeCategory];
        else if (node.keywords) categories = typeof node.keywords === 'string' ? node.keywords.split(',').map(s=>s.trim()) : node.keywords || [];

        const rating = node.aggregateRating && node.aggregateRating.ratingValue ? Number(node.aggregateRating.ratingValue) : (node.ratingValue ? Number(node.ratingValue) : 0);

        items.push({
            id,
            title,
            ingredients: Array.isArray(ingredients) ? ingredients : [ingredients].filter(Boolean),
            instructions,
            prep_time: Number(prep_time || 0),
            cook_time: Number(cook_time || 0),
            servings,
            categories: categories.map(c => String(c).toLowerCase()),
            rating,
            commonIngredients: [],
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
    return (Number(recipe.prep_time) || 0) + (Number(recipe.cook_time) || 0);
};

export const formatIngredient = (ing) => {
    if (!ing) return '';
    if (typeof ing === 'string') return ing;
    if (ing.name) return ing.name;
    return JSON.stringify(ing);
};

export const formatCopyIngredients = (recipe) => (recipe.ingredients || []).map(formatIngredient).join('\n');
export const formatCopyInstructions = (recipe) => (recipe.instructions || []).map((s,i)=>`${i+1}. ${s}`).join('\n');

export const getProperCase = (s) => { if (!s) return ''; return s.split(' ').map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(' '); };

/**
 * Converts a raw human-readable string into a URL-safe query parameter slug.
 * Example: "Mom's Apple Pie!  " -> "moms-apple-pie"
 */
export const nameToQueryParam = (name) => {
  if (!name) return 'unknown';
  
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove punctuation and special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-');         // Collapse multiple consecutive hyphens

  return encodeURIComponent(normalized);
};

/**
 * Converts a URL-safe query parameter slug back into a clean, capitalized display name.
 * Example: "moms-apple-pie" -> "Moms Apple Pie"
 */
export const queryParamToName = (param) => {
  if (!param) return 'Unknown';

  return decodeURIComponent(param)
    .replace(/-/g, ' ')                                    // Replace hyphens with spaces
    .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase()) // Capitalize first letter of each word
    .trim();
};
