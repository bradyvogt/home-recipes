import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { toSlug } from './utils/helpers';
import { fetchRecipesData, getRecipesUrl, getStorageFileName } from './utils/supabaseClient';
import { useAuth } from './AuthContext';

export default function SingleRecipe() {
  const [searchParams] = useSearchParams();
  const { dataSourceId } = useParams();
  const navigate = useNavigate();
  const { session, loading: authLoading, supabase } = useAuth();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    name: '',
    description: '',
    sourceType: '',
    sourceLink: '',
    recipeYield: '',
    prepTime: '',
    cookTime: '',
    totalTime: '',
    recipeCategory: '',
    recipeCuisine: '',
    recipeIngredient: '',
    recipeInstructions: '',
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editMessage, setEditMessage] = useState(null);

  const rawParam = searchParams.get('name');
  const storageFileName = getStorageFileName(dataSourceId);

  const normalizeEditField = (field) => {
    if (!field) return '';
    if (Array.isArray(field)) return field.map((item) => (typeof item === 'string' ? item : item?.text || item?.name || '')).filter(Boolean).join('\n');
    if (typeof field === 'string') return field;
    return field.text || field.name || String(field);
  };

  const initializeEditValues = (recipeData) => ({
    name: recipeData.name || recipeData.title || '',
    description: recipeData.description || '',
    sourceType: recipeData.sourceType || recipeData.source_type || '',
    sourceLink: recipeData.sourceLink || recipeData.source_link || recipeData.url || '',
    recipeYield: recipeData.recipeYield || recipeData.servings || '',
    prepTime: recipeData.prepTime || recipeData.prep_time || '',
    cookTime: recipeData.cookTime || recipeData.cook_time || '',
    totalTime: recipeData.totalTime || recipeData.total_time || '',
    recipeCategory: (Array.isArray(recipeData.recipeCategory) ? recipeData.recipeCategory : recipeData.categories || []).filter(Boolean).join(', '),
    recipeCuisine: (Array.isArray(recipeData.recipeCuisine) ? recipeData.recipeCuisine : recipeData.cuisine || []).filter(Boolean).join(', '),
    recipeIngredient: normalizeEditField(recipeData.recipeIngredient || recipeData.ingredients),
    recipeInstructions: normalizeEditField(recipeData.recipeInstructions || recipeData.instructions),
  });

  const refreshRecipesCache = async () => {
    try {
      const rawData = await fetchRecipesData(dataSourceId, { bustCache: true });
      const parsedRecipes = window.Helpers
        ? window.Helpers.parseJsonLdToRecipes(rawData)
        : rawData;

      window.__loadedRecipes = parsedRecipes;
      return parsedRecipes;
    } catch (error) {
      console.error('Failed to refresh recipes cache:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadRecipeData = async () => {
      try {
        if (!rawParam) {
          throw new Error('No recipe parameter specified in URL.');
        }

        if (window.__loadedRecipes && Array.isArray(window.__loadedRecipes)) {
          const found = window.__loadedRecipes.find(
            (r) => toSlug(r.name || r.title || '') === rawParam
          );
          if (found) {
            setRecipe(found);
            setLoading(false);
            return;
          }
        }

        const rawData = await fetchRecipesData(dataSourceId);

        const parsedRecipes = window.Helpers
          ? window.Helpers.parseJsonLdToRecipes(rawData)
          : rawData;

        window.__loadedRecipes = parsedRecipes;

        const foundRecipe = parsedRecipes.find(
          (r) => toSlug(r.name || r.title || '') === rawParam.toLowerCase()
        );

        if (!foundRecipe) {
          throw new Error(`Could not find a recipe matching "${rawParam}"`);
        }

        setRecipe(foundRecipe);
        setEditValues(initializeEditValues(foundRecipe));
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadRecipeData();
  }, [dataSourceId, rawParam]);

  useEffect(() => {
    if (recipe) {
      setEditValues(initializeEditValues(recipe));
    }
  }, [recipe]);

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.spinner}>Loading recipe details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.errorCard}>
          <h3>Error Loading Recipe</h3>
          <p>{error}</p>
          <button onClick={() => navigate(dataSourceId ? `/${dataSourceId}` : '/')} style={styles.backButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const {
    title,
    name,
    description,
    sourceType,
    sourceLink,
    recipeYield,
    prepTime,
    cookTime,
    totalTime,
    recipeIngredient = [],
    recipeInstructions = [],
    recipeCategory = [],
    recipeCuisine = [],
    rating,
  } = recipe;

  const displayName = name || title || 'Untitled Recipe';
  const servings = recipeYield || recipe.servings || 0;

  const recipeSlug = rawParam || toSlug(recipe?.name || recipe?.title || '');

  const handleEditChange = (field) => (event) => {
    setEditValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const getArrayFromTextarea = (value) => value.split('\n').map((line) => line.trim()).filter(Boolean);

  const handleSaveEdit = async () => {
    setEditError(null);
    setEditMessage(null);
    setSaving(true);

    try {
      if (!recipeSlug) throw new Error('Unable to determine recipe identifier.');

      const payload = {
        name: editValues.name,
        description: editValues.description,
        sourceType: editValues.sourceType,
        sourceLink: editValues.sourceLink,
        recipeYield: editValues.recipeYield ? Number(editValues.recipeYield) : undefined,
        prepTime: editValues.prepTime,
        cookTime: editValues.cookTime,
        totalTime: editValues.totalTime,
        recipeCategory: getArrayFromTextarea(editValues.recipeCategory),
        recipeCuisine: getArrayFromTextarea(editValues.recipeCuisine),
        recipeIngredient: getArrayFromTextarea(editValues.recipeIngredient),
        recipeInstructions: getArrayFromTextarea(editValues.recipeInstructions),
      };

      const functionName = `recipe-ingest/${recipeSlug}?storageFile=${encodeURIComponent(storageFileName)}`;
      const { error, data } = await supabase.functions.invoke(functionName, {
        method: 'PUT',
        body: payload,
      });

      if (error) {
        throw error;
      }

      await refreshRecipesCache();

      const updatedRecipe = data || { ...recipe, ...payload };
      const refreshedRecipes = window.__loadedRecipes && Array.isArray(window.__loadedRecipes)
        ? window.__loadedRecipes
        : null;
      const refreshedRecipe = refreshedRecipes?.find((item) => toSlug(item.name || item.title || '') === recipeSlug) || updatedRecipe;

      setRecipe(refreshedRecipe);
      setEditValues(initializeEditValues(refreshedRecipe));
      setEditMessage('Recipe saved successfully.');
      setIsEditing(false);

      try { window.dispatchEvent(new Event('recipes:refresh')); } catch (eventError) { /* ignore in non-browser env */ }

      if (window.__loadedRecipes && Array.isArray(window.__loadedRecipes)) {
        window.__loadedRecipes = window.__loadedRecipes.map((item) => {
          const itemSlug = toSlug(item.name || item.title || '');
          return itemSlug === recipeSlug ? refreshedRecipe : item;
        });
      }
    } catch (err) {
      setEditError(err?.message || 'Unable to save recipe edits.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article style={styles.pageContainer}>
      <button onClick={() => navigate(dataSourceId ? `/${dataSourceId}` : '/')} style={styles.textBackButton}>
        &larr; Back to Recipes
      </button>

      <header style={styles.header}>
        <h1 style={styles.title}>{displayName}</h1>

        {rating ? (
          <div style={styles.ratingBadge}>
            Rating: ★ {Number(rating).toFixed(1)}
          </div>
        ) : null}

        {(sourceType || sourceLink) && (
          <div style={styles.sourceRow}>
            {sourceType && <span style={styles.sourceBadge}>{sourceType}</span>}
            {sourceLink && (
              <a
                href={sourceLink}
                target="_blank"
                rel="noreferrer"
                style={styles.sourceLink}
              >
                View source
              </a>
            )}
          </div>
        )}

        {description && <p style={styles.description}>{description}</p>}
      </header>

      <section style={styles.actionRow}>
        {authLoading ? (
          <span style={styles.sectionMessage}>Checking login status...</span>
        ) : session ? (
          <>
            <button
              onClick={() => setIsEditing((current) => !current)}
              style={styles.editButton}
            >
              {isEditing ? 'Cancel edit' : 'Edit recipe'}
            </button>
            {isEditing && (
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                style={styles.saveButton}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            style={styles.editButton}
          >
            Sign in to edit
          </button>
        )}
      </section>

      {editError && <div style={styles.errorCard}><p>{editError}</p></div>}
      {editMessage && <div style={styles.successCard}><p>{editMessage}</p></div>}

      {isEditing && (
        <section style={styles.editForm}>
          <h2 style={styles.sectionTitle}>Edit Recipe</h2>
          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>Title</label>
            <input value={editValues.name} onChange={handleEditChange('name')} style={styles.fieldInput} />
          </div>
          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>Description</label>
            <textarea value={editValues.description} onChange={handleEditChange('description')} style={styles.fieldTextarea} rows={3} />
          </div>
          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>Source type</label>
            <input value={editValues.sourceType} onChange={handleEditChange('sourceType')} style={styles.fieldInput} />
          </div>
          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>Source link</label>
            <input value={editValues.sourceLink} onChange={handleEditChange('sourceLink')} style={styles.fieldInput} />
          </div>
          <div style={styles.fieldRowGroup}>
            <div style={styles.fieldRowSmall}>
              <label style={styles.fieldLabel}>Servings</label>
              <input value={editValues.recipeYield} onChange={handleEditChange('recipeYield')} style={styles.fieldInput} />
            </div>
            <div style={styles.fieldRowSmall}>
              <label style={styles.fieldLabel}>Prep time</label>
              <input value={editValues.prepTime} onChange={handleEditChange('prepTime')} style={styles.fieldInput} />
            </div>
            <div style={styles.fieldRowSmall}>
              <label style={styles.fieldLabel}>Cook time</label>
              <input value={editValues.cookTime} onChange={handleEditChange('cookTime')} style={styles.fieldInput} />
            </div>
            <div style={styles.fieldRowSmall}>
              <label style={styles.fieldLabel}>Total time</label>
              <input value={editValues.totalTime} onChange={handleEditChange('totalTime')} style={styles.fieldInput} />
            </div>
          </div>
          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>Categories (comma separated)</label>
            <input value={editValues.recipeCategory} onChange={handleEditChange('recipeCategory')} style={styles.fieldInput} />
          </div>
          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>Cuisine (comma separated)</label>
            <input value={editValues.recipeCuisine} onChange={handleEditChange('recipeCuisine')} style={styles.fieldInput} />
          </div>
          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>Ingredients (one per line)</label>
            <textarea value={editValues.recipeIngredient} onChange={handleEditChange('recipeIngredient')} style={styles.fieldTextarea} rows={5} />
          </div>
          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>Instructions (one per line)</label>
            <textarea value={editValues.recipeInstructions} onChange={handleEditChange('recipeInstructions')} style={styles.fieldTextarea} rows={6} />
          </div>
        </section>
      )}

      {(servings || prepTime || cookTime || totalTime || recipeCategory.length || recipeCuisine.length) && (
        <section style={styles.metaGrid}>
          {servings ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Servings</span>
              <span style={styles.metaValue}>{servings}</span>
            </div>
          ) : null}
          {prepTime ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Prep Time</span>
              <span style={styles.metaValue}>{prepTime}</span>
            </div>
          ) : null}
          {cookTime ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Cook Time</span>
              <span style={styles.metaValue}>{cookTime}</span>
            </div>
          ) : null}
          {totalTime ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Total Time</span>
              <span style={styles.metaValue}>{totalTime}</span>
            </div>
          ) : null}
          {recipeCategory.length ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Categories</span>
              <span style={styles.metaValue}>{recipeCategory.join(', ')}</span>
            </div>
          ) : null}
          {recipeCuisine.length ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Cuisine</span>
              <span style={styles.metaValue}>{recipeCuisine.join(', ')}</span>
            </div>
          ) : null}
        </section>
      )}

      <div style={styles.contentLayout}>
        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Ingredients</h2>
          <ul style={styles.ingredientList}>
            {recipeIngredient.map((ingredient, idx) => (
              <li key={idx} style={styles.ingredientItem}>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" style={styles.checkbox} />
                  <span>{ingredient}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Instructions</h2>
          <ol style={styles.instructionList}>
            {recipeInstructions.map((step, idx) => (
              <li key={idx} style={styles.instructionItem}>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}

const styles = {
  pageContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '30px 20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#1f2937',
    lineHeight: '1.6',
  },
  centerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
  },
  errorCard: {
    textAlign: 'center',
    padding: '30px',
    border: '1px solid #fca5a5',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    maxWidth: '400px',
  },
  textBackButton: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    padding: '0',
    marginBottom: '20px',
  },
  backButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '15px',
  },
  header: {
    marginBottom: '30px',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    margin: '0 0 10px 0',
    color: '#111827',
  },
  ratingBadge: {
    display: 'inline-block',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.875rem',
    marginBottom: '15px',
  },
  sourceRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: '15px',
  },
  sourceBadge: {
    backgroundColor: '#e0f2fe',
    color: '#0c4a6e',
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  sourceLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '600',
  },
  description: {
    fontSize: '1.125rem',
    color: '#4b5563',
    fontStyle: 'italic',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '20px',
    backgroundColor: '#f3f4f6',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '30px',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  metaLabel: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    fontWeight: '700',
    color: '#6b7280',
  },
  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionMessage: {
    color: '#6b7280',
    fontSize: '0.95rem',
  },
  editButton: {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 18px',
    cursor: 'pointer',
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 18px',
    cursor: 'pointer',
    fontWeight: '700',
  },
  successCard: {
    textAlign: 'center',
    padding: '18px',
    border: '1px solid #a7f3d0',
    backgroundColor: '#ecfdf5',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  fieldRowGroup: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  fieldRowSmall: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fieldLabel: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
  },
  fieldInput: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '1rem',
  },
  fieldTextarea: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '1rem',
    minHeight: '120px',
    resize: 'vertical',
  },
  editForm: {
    marginBottom: '30px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
  },
  metaValue: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
  },
  contentLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    padding: '25px',
    borderRadius: '8px',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: '0 0 20px 0',
    borderBottom: '2px solid #f3f4f6',
    paddingBottom: '10px',
    color: '#111827',
  },
  ingredientList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  ingredientItem: {
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    cursor: 'pointer',
  },
  checkbox: {
    marginTop: '5px',
    cursor: 'pointer',
  },
  instructionList: {
    paddingLeft: '20px',
    margin: 0,
  },
  instructionItem: {
    paddingBottom: '15px',
    color: '#374151',
  },
  spinner: {
    fontSize: '1.2rem',
    color: '#4b5563',
  },
};
