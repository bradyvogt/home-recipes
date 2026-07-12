import { useState, useEffect } from 'react';

import Navbar from './Navbar.jsx';
import { RECIPES_URL } from './utils/constants.js';
import { Link } from 'react-router-dom';
import * as Helpers from './utils/helpers.js';

const getSimilarRecipes = (recipe, all = window.__loadedRecipes || []) => {
    const normalizeIngredient = (ingredient) => {
        const value = typeof ingredient === 'string' ? ingredient : Helpers.formatIngredient(ingredient);
        return value.toLowerCase();
    };

    const baseIngredients = new Set((recipe.recipeIngredient || recipe.ingredients || []).map(normalizeIngredient));
    const scored = all.map((r) => {
        if (r.id === recipe.id) return null;
        const recipeIngredients = new Set((r.recipeIngredient || r.ingredients || []).map(normalizeIngredient));
        let common = 0;
        baseIngredients.forEach((item) => { if (recipeIngredients.has(item)) common++; });
        return {
            recipe: r,
            score: common,
            commonIngredients: [...baseIngredients].filter((item) => recipeIngredients.has(item)),
        };
    }).filter(Boolean).sort((a, b) => b.score - a.score);

    return scored.slice(0, 10).map((s) => ({ ...s.recipe, commonIngredients: s.commonIngredients }));
};

window.__loadedRecipes = [];

const SimilarRecipePopup = ({ isOpen, onClose, title, recipes }) => {
    if (!isOpen) return null;

    return (
        <div className="modal show d-block similar-popup" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header" style={{background:'#246231',color:'#fff'}}>
                <h5 className="modal-title">{title}</h5>
                <button type="button" className="btn-close" style={{color:'#fff',fontWeight:'bold'}} onClick={onClose}>×</button>
              </div>
              <div className="modal-body" style={{background:'#ecf8ef'}}>
                <ul>
                  {recipes.map((recipe) => (
                    <li key={recipe.id} style={{background:'#b6e2c6',margin:'10px 0',borderRadius:'6px',padding:'10px'}}>
                      <div className="row">
                        <div className="col-xs-8 text-left">
                          <p style={{margin:0,fontWeight:'bold',color:'#246231'}}>{recipe.name || recipe.title}</p>
                        </div>
                        <div className="col-xs-4 text-right">
                          <p style={{margin:0,color:'#246231'}}>Common Ingredients: {recipe.commonIngredients.join(', ')}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer" style={{background:'#ecf8ef'}}>
                <button type="button" className="btn btn-similar-close" style={{background:'#246231',color:'#fff',border:'none',borderRadius:'4px',padding:'6px 18px'}} onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
    );
};

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

const RecipeSummary = ({ recipe }) => {
    const recipeName = recipe.name || recipe.title || 'Recipe';
    const categories = recipe.recipeCategory || recipe.categories || [];
    const cuisine = recipe.recipeCuisine || [];
    const servingValue = recipe.recipeYield || recipe.servings || null;

    return (
        <div className="recipe-header">
            <h2 className="recipe-title">{recipeName}</h2>
            <Link to={`/recipe?name=${Helpers.nameToQueryParam(recipeName)}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <img src={'./icons/open_new_tab.svg'} alt="icon" style={{ width: '30px', height: '30px', cursor: 'pointer' }} />
            </Link>
            {servingValue ? (<IconMetric icon={ './icons/servings.svg' } label={ servingValue } />) : null}
            {Helpers.getTotalCookTime(recipe) ? (<IconMetric icon={ './icons/clock.svg' } label={ Helpers.formatTime(Helpers.getTotalCookTime(recipe)) } />) : null}
            {categories.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#4b5563' }}>
                {categories.join(', ')}
              </div>
            )}
            {cuisine.length > 0 && (
              <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                Cuisine: {cuisine.join(', ')}
              </div>
            )}
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

const RecipeList = ({ recipes, onSimilarClick }) => {

    return (
        <div>
            {recipes.map((recipe) => {
                const ingredients = recipe.recipeIngredient || recipe.ingredients || [];
                const instructions = recipe.recipeInstructions || recipe.instructions || [];
                return (
                    <ToggleContainer
                        key={recipe.id}
                        header={<RecipeSummary key={recipe.id} recipe={recipe} />}
                        details={
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                    {recipe.prep_time > 0 && (
                                        <IconMetric icon={'./icons/prep_time.svg'} label={Helpers.formatTime(recipe.prep_time)} />
                                    )}
                                    {recipe.cook_time > 0 && (
                                        <IconMetric icon={'./icons/cook_time.svg'} label={Helpers.formatTime(recipe.cook_time)} />
                                    )}
                                    <button className="btn btn-similar" onClick={() => onSimilarClick(recipe)}>
                                        <span style={{display:'inline-block',verticalAlign:'middle',marginRight:'6px'}}>&#128279;</span> <span>Similar</span>
                                    </button>
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
        (r.categories || []).forEach(cat => {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
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
    const [similarRecipes, setSimilarRecipes] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [sortBy, setSortBy] = useState('title');
    const [sortAsc, setSortAsc] = useState(true);

    useEffect(() => {
        fetch(RECIPES_URL)
            .then(res => res.json())
            .then(data => {
                const parsed = Helpers.parseJsonLdToRecipes(data);
                window.__loadedRecipes = parsed;
                setRecipes(parsed);
            })
            .catch(err => {
                console.error('Failed to load recipes:', err);
            });
    }, []);

    // Get all unique categories from recipes (flattened)
    const allCategories = Array.from(new Set(recipes.flatMap(r => Array.isArray(r.categories) ? r.categories.map(c => c.toLowerCase()) : [])));

    // Filtering
    let filteredRecipes = recipes.filter(r => {
        if (search && !(r.title || '').toLowerCase().includes(search.toLowerCase())) return false;
        if (selectedCategory && !((r.categories || []).includes(selectedCategory))) return false;
        return true;
    });

    // Sorting (support title and rating)
    filteredRecipes.sort((a, b) => {
        if (sortBy === 'title') {
            const cmp = (a.title || '').localeCompare(b.title || '');
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

    // When a recipe is clicked, display a popup with related recipes
    const handleRecipeSimilarClick = (recipe) => {
        setSimilarRecipes(getSimilarRecipes(recipe, recipes));
        setIsPopupOpen(true);
    };

    return (
        <div>
            <SearchBar searchValue={search} onSearchChange={setSearch} />
            <PillBoxCategorySelector
                categories={allCategories}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                recipes={recipes}
            />
            <RecipeList recipes={filteredRecipes} onSimilarClick={handleRecipeSimilarClick} />
            <SimilarRecipePopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} title="Similar Recipes" recipes={similarRecipes} />
        </div>
    );
}

export default AllRecipes;