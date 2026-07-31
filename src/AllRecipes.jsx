import { useState, useEffect } from 'react';

import Navbar from './Navbar.jsx';
import { getRecipesUrl } from './utils/supabaseClient';
import { Link, useParams } from 'react-router-dom';
import * as Helpers from './utils/helpers';

window.__loadedRecipes = [];

const ToggleContainer = ({ header, details }) => {
    const [isVisible, setIsVisible] = useState(false);

    const toggleDetails = () => setIsVisible(!isVisible);

    return (
        <div className="toggle-container">
            <div className="toggle-header-container" onClick={toggleDetails} >
                {header}
            </div>
            {isVisible && (
                <div className="toggle-details-container">
                    {details}
                </div>
            )}
        </div>
    );
};

const IconMetric = ({ icon, label }) => {
    return (
        <div className="icon-label" style={{ display: 'flex', alignItems: 'center', gap: '5px'}}>
            <div className="icon-half">
                <img src={icon} alt="icon" style={{ width: '30px', height: '30px' }} />
            </div>
            <div className="label-half">
                <h4 style={{margin: '0'}}>{label}</h4>
            </div>
        </div>
    );
};

const RecipeSummary = ({ recipe, dataSourceId }) => {
    const recipeName = Helpers.getRecipeDisplayName(recipe) || 'Recipe';
    const categories = Helpers.getRecipeCategories(recipe);
    const cuisine = recipe.recipeCuisine || [];
    const servingValue = Helpers.getRecipeServings(recipe) || null;
    const recipePath = dataSourceId ? `/${dataSourceId}/recipe?name=${Helpers.toSlug(recipeName)}` : `/recipe?name=${Helpers.toSlug(recipeName)}`;

    return (
        <div className="recipe-header">
            <h2 className="recipe-title">{recipeName}</h2>
            <Link to={recipePath} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <img src={'./icons/recipe_details.svg'} alt="icon" style={{ width: '30px', height: '30px', cursor: 'pointer' }} />
            </Link>
            {servingValue ? (<IconMetric icon={ './icons/servings.svg' } label={ servingValue } />) : null}
            {Helpers.getTotalCookTime(recipe) ? (<IconMetric icon={ './icons/clock.svg' } label={ Helpers.formatTime(Helpers.getTotalCookTime(recipe)) } />) : null}
        </div>
    );
};

const CopyButton = ({ textToCopy }) => {
    const [copyStatus, setCopyStatus] = useState("");

    const handleCopyClick = async () => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopyStatus("success");
        } catch (err) {
            setCopyStatus("error");
        }

        setTimeout(() => {
            setCopyStatus("");
        }, 2000);
    };

    return (
        <img 
            src={
                copyStatus === 'success' ? 'icons/copy_success.svg' : 
                copyStatus === 'error' ? 'icons/copy_error.svg' :
                'icons/copy.svg'
            } 
            onClick={() => handleCopyClick()}
            alt="icon"
            style={{ width: '20px', height: '20px' }}
        />
    );
};

const RecipeList = ({ recipes, dataSourceId }) => {

    return (
        <div>
            {recipes.map((recipe) => {
                const ingredients = Helpers.getRecipeIngredients(recipe);
                const instructions = Helpers.getRecipeInstructions(recipe);
                return (
                    <ToggleContainer
                        key={recipe.id}
                        header={<RecipeSummary key={recipe.id} recipe={recipe} dataSourceId={dataSourceId} />}
                        details={
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                    {recipe.prep_time > 0 && (
                                        <IconMetric icon={'./icons/prep_time.svg'} label={Helpers.formatTime(recipe.prep_time)} />
                                    )}
                                    {recipe.cook_time > 0 && (
                                        <IconMetric icon={'./icons/cook_time.svg'} label={Helpers.formatTime(recipe.cook_time)} />
                                    )}
                                </div>

                                {ingredients.length > 0 && (
                                    <>
                                        <h4>Ingredients <CopyButton textToCopy={Helpers.formatCopyIngredients(recipe)}/></h4>
                                        <ul>
                                            {ingredients.map((ingredient, idx) => (
                                                <li key={idx}>{Helpers.formatIngredient(ingredient)}</li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {instructions.length > 0 && (
                                    <>
                                        <h4>Instructions <CopyButton textToCopy={Helpers.formatCopyInstructions(recipe)}/></h4>
                                        <ul>
                                            {instructions.map((instruction, index) => (
                                                <li key={index}>{instruction}</li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        }
                    />
                );
            })}
        </div>
    );
};

const SearchBar = ({ searchValue, onSearchChange }) => {
    return (
        <div className="search-bar-container">
            <input
                type="text"
                className="search-bar-input"
                placeholder="Search recipes by name..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
            />
        </div>
    );
};

// PillBoxCategorySelector: pill-style radio button selector for categories
const PillBoxCategorySelector = ({ categories, selectedCategory, onSelect, recipes }) => {
    // Count recipes per category
    const categoryCounts = {};
    recipes.forEach(r => {
        (Helpers.getRecipeCategories(r) || []).forEach(cat => {
            const normalizedCat = String(cat).toLowerCase();
            categoryCounts[normalizedCat] = (categoryCounts[normalizedCat] || 0) + 1;
        });
    });

    // Sort categories by count descending, then alphabetically
    const sortedCategories = [...categories].sort((a, b) => {
        const diff = (categoryCounts[b] || 0) - (categoryCounts[a] || 0);
        if (diff !== 0) return diff;
        return a.localeCompare(b);
    });

    // Count for 'All'
    const allCount = recipes.length;

    return (
        <div className="pill-box-container">
            <button
                type="button"
                className={selectedCategory === null ? 'pill-box selected' : 'pill-box'}
                onClick={() => onSelect(null)}
            >
                All <span className="pill-count">({allCount})</span>
            </button>
            {sortedCategories.map((cat) => (
                <button
                    key={cat}
                    type="button"
                    className={selectedCategory === cat ? 'pill-box selected' : 'pill-box'}
                    onClick={() => onSelect(cat)}
                >
                    {Helpers.getProperCase(cat)} <span className="pill-count">({categoryCounts[cat] || 0})</span>
                </button>
            ))}
        </div>
    );
};

// AllRecipes Component - Manages state and displays recipes
const AllRecipes = () => {
    const [recipes, setRecipes] = useState([]);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [sortBy, setSortBy] = useState('title');
    const [sortAsc, setSortAsc] = useState(true);
    const { dataSourceId } = useParams();

    useEffect(() => {
        let isMounted = true;

        const fetchRecipes = (options = {}) => {
            fetch(getRecipesUrl(dataSourceId, options))
                .then(res => res.json())
                .then(data => {
                    const parsed = Helpers.parseJsonLdToRecipes(data);
                    window.__loadedRecipes = parsed;
                    if (isMounted) setRecipes(parsed);
                })
                .catch(err => {
                    console.error('Failed to load recipes:', err);
                });
        };

        fetchRecipes({ bustCache: true });

        const handler = () => fetchRecipes({ bustCache: true });
        window.addEventListener('recipes:refresh', handler);

        return () => {
            isMounted = false;
            window.removeEventListener('recipes:refresh', handler);
        };
    }, [dataSourceId]);

    // Get all unique categories from recipes (flattened)
    const allCategories = Array.from(new Set(recipes.flatMap(r => Array.isArray(r.categories) ? r.categories.map(c => c.toLowerCase()) : [])));

    // Filtering
    let filteredRecipes = recipes.filter(r => {
        const searchText = [Helpers.getRecipeDisplayName(r), ...Helpers.getRecipeCategories(r)].join(' ').toLowerCase();
        if (search && !searchText.includes(search.toLowerCase())) return false;
        if (selectedCategory && !((Helpers.getRecipeCategories(r) || []).map((cat) => String(cat).toLowerCase()).includes(selectedCategory))) return false;
        return true;
    });

    // Sorting (support title and rating)
    filteredRecipes.sort((a, b) => {
        if (sortBy === 'title') {
            const cmp = (Helpers.getRecipeDisplayName(a) || '').localeCompare(Helpers.getRecipeDisplayName(b) || '');
            return sortAsc ? cmp : -cmp;
        }
        if (sortBy === 'rating') {
            const ra = Number(a.rating || 0);
            const rb = Number(b.rating || 0);
            const cmp = ra - rb;
            return sortAsc ? -cmp : cmp; // higher rating first when asc=true
        }
        return 0;
    });

    return (
        <div>
            <SearchBar searchValue={search} onSearchChange={setSearch} />
            <PillBoxCategorySelector
                categories={allCategories}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                recipes={recipes}
            />
            <RecipeList recipes={filteredRecipes} dataSourceId={dataSourceId} />
        </div>
    );
}

export default AllRecipes;