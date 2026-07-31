import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { toSlug, formatTime, parseDurationToMinutes, getRecipeDisplayName } from './utils/helpers';
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
  const [freeformText, setFreeformText] = useState('');
  const [freeformSaving, setFreeformSaving] = useState(false);
  const [freeformError, setFreeformError] = useState(null);
  const [freeformMessage, setFreeformMessage] = useState(null);
  const [isFreeformEditorOpen, setIsFreeformEditorOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState(null);

  const rawParam = searchParams.get('name');
  const storageFileName = getStorageFileName(dataSourceId);

  const getMinutesFromTimeValue = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return 0;
      if (/^\d+$/.test(trimmed)) return Number(trimmed);
      return parseDurationToMinutes(trimmed);
    }
    return 0;
  };

  const serializeTimeValue = (value) => {
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes < 0) return '';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    let iso = 'PT';
    if (hours) iso += `${hours}H`;
    if (remainingMinutes) iso += `${remainingMinutes}M`;
    return iso || 'PT0M';
  };

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
    prepTime: getMinutesFromTimeValue(recipeData.prepTime || recipeData.prep_time || recipeData.prep || ''),
    cookTime: getMinutesFromTimeValue(recipeData.cookTime || recipeData.cook_time || recipeData.cook || ''),
    totalTime: getMinutesFromTimeValue(recipeData.totalTime || recipeData.total_time || recipeData.total || ''),
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
            (r) => toSlug(getRecipeDisplayName(r) || '') === rawParam
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
          (r) => toSlug(getRecipeDisplayName(r) || '') === rawParam.toLowerCase()
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
      setFreeformText('');
      setFreeformError(null);
      setFreeformMessage(null);
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

  const displayName = getRecipeDisplayName(recipe) || name || title || 'Untitled Recipe';
  const servings = recipeYield || recipe.servings || 0;
  const prepMinutes = getMinutesFromTimeValue(prepTime);
  const cookMinutes = getMinutesFromTimeValue(cookTime);
  const totalMinutes = getMinutesFromTimeValue(totalTime);

  const recipeSlug = rawParam || toSlug(getRecipeDisplayName(recipe) || '');

  const handleEditChange = (field) => (event) => {
    const rawValue = event.target.value;
    if (field === 'prepTime' || field === 'cookTime' || field === 'totalTime') {
      setEditValues((prev) => ({
        ...prev,
        [field]: rawValue === '' ? '' : Number(rawValue),
      }));
      return;
    }

    setEditValues((prev) => ({ ...prev, [field]: rawValue }));
  };

  const handleShareRecipe = async () => {
    const recipeUrl = window.location.href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(recipeUrl);
        setShareMessage('Recipe link copied to clipboard.');
        return;
      }

      throw new Error('Clipboard access is unavailable in this browser.');
    } catch (err) {
      setShareMessage(`Unable to copy automatically. Please copy this link manually: ${recipeUrl}`);
    }
  };

  const handleToggleFreeformEditor = () => {
    setIsFreeformEditorOpen((current) => !current);
    setIsEditing(false);
    setFreeformError(null);
    setFreeformMessage(null);
  };

  const getArrayFromTextarea = (value) => value.split('\n').map((line) => line.trim()).filter(Boolean);

  const handleSaveFreeformEdit = async () => {
    setFreeformError(null);
    setFreeformMessage(null);
    setFreeformSaving(true);

    try {
      if (!recipeSlug) throw new Error('Unable to determine recipe identifier.');

      const text = freeformText.trim();
      if (!text) throw new Error('Write recipe directions first.');

      const functionName = `recipe-ingest/freeform-text/${recipeSlug}?storageFile=${encodeURIComponent(storageFileName)}`;
      const { error, data } = await supabase.functions.invoke(functionName, {
        method: 'PUT',
        body: { text, storageFile: storageFileName },
      });

      if (error) {
        throw error;
      }

      await refreshRecipesCache();

      const updatedRecipe = data?.recipe || data || recipe;
      const refreshedRecipes = window.__loadedRecipes && Array.isArray(window.__loadedRecipes)
        ? window.__loadedRecipes
        : null;
      const refreshedRecipe = refreshedRecipes?.find((item) => toSlug(getRecipeDisplayName(item) || '') === recipeSlug) || updatedRecipe;

      setRecipe(refreshedRecipe);
      setEditValues(initializeEditValues(refreshedRecipe));
      setFreeformMessage('Recipe updated from directions.');
      setIsFreeformEditorOpen(false);
      setFreeformText('');

      try { window.dispatchEvent(new Event('recipes:refresh')); } catch (eventError) { /* ignore in non-browser env */ }

      if (window.__loadedRecipes && Array.isArray(window.__loadedRecipes)) {
        window.__loadedRecipes = window.__loadedRecipes.map((item) => {
          const itemSlug = toSlug(getRecipeDisplayName(item) || '');
          return itemSlug === recipeSlug ? refreshedRecipe : item;
        });
      }
    } catch (err) {
      setFreeformError(err?.message || 'Unable to save directions edit.');
    } finally {
      setFreeformSaving(false);
    }
  };

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
        prepTime: serializeTimeValue(editValues.prepTime),
        cookTime: serializeTimeValue(editValues.cookTime),
        totalTime: serializeTimeValue(editValues.totalTime),
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
      const refreshedRecipe = refreshedRecipes?.find((item) => toSlug(getRecipeDisplayName(item) || '') === recipeSlug) || updatedRecipe;

      setRecipe(refreshedRecipe);
      setEditValues(initializeEditValues(refreshedRecipe));
      setEditMessage('Recipe saved successfully.');
      setIsEditing(false);

      try { window.dispatchEvent(new Event('recipes:refresh')); } catch (eventError) { /* ignore in non-browser env */ }

      if (window.__loadedRecipes && Array.isArray(window.__loadedRecipes)) {
        window.__loadedRecipes = window.__loadedRecipes.map((item) => {
          const itemSlug = toSlug(getRecipeDisplayName(item) || '');
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
    <article style={styles.pageContainer} className="recipes-container single-recipe-page">
      <button onClick={() => navigate(dataSourceId ? `/${dataSourceId}` : '/')} style={styles.textBackButton}>
        &larr; Back to Recipes
      </button>

      <header style={styles.header} className="single-recipe-header">
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
        <button onClick={handleShareRecipe} style={styles.shareButton}>
          Copy link
        </button>

        {authLoading ? (
          <span style={styles.sectionMessage}>Checking login status...</span>
        ) : session ? (
          <>
            <button
              onClick={() => {
                setIsEditing((current) => !current);
                setIsFreeformEditorOpen(false);
                setFreeformError(null);
                setFreeformMessage(null);
              }}
              style={styles.editButton}
            >
              {isEditing ? 'Cancel edit' : 'Edit recipe'}
            </button>
            <button
              onClick={handleToggleFreeformEditor}
              style={{ ...styles.editButton, backgroundColor: '#f59e0b' }}
            >
              {isFreeformEditorOpen ? 'Cancel directions edit' : 'Edit with Directions'}
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

      {shareMessage && <div style={styles.shareMessage}>{shareMessage}</div>}
      {editError && <div style={styles.errorCard}><p>{editError}</p></div>}
      {editMessage && <div style={styles.successCard}><p>{editMessage}</p></div>}
      {freeformError && <div style={styles.errorCard}><p>{freeformError}</p></div>}
      {freeformMessage && <div style={styles.successCard}><p>{freeformMessage}</p></div>}

      {isFreeformEditorOpen && (
        <section style={styles.editForm} className="single-recipe-card">
          <h2 style={styles.sectionTitle}>Edit Recipe with Directions</h2>
          <div style={styles.fieldRow}>
            <label style={styles.fieldLabel}>Recipe directions</label>
            <textarea
              value={freeformText}
              onChange={(e) => setFreeformText(e.target.value)}
              style={styles.fieldTextarea}
              rows={10}
              placeholder="Paste or type recipe directions here..."
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleSaveFreeformEdit}
              disabled={freeformSaving}
              style={styles.saveButton}
            >
              {freeformSaving ? 'Saving...' : 'Save directions'}
            </button>
            <button
              onClick={handleToggleFreeformEditor}
              style={{ ...styles.editButton, backgroundColor: '#ef4444' }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {isEditing && (
        <section style={styles.editForm} className="single-recipe-card">
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
              <input type="number" min="0" step="1" value={editValues.prepTime} onChange={handleEditChange('prepTime')} style={styles.fieldInput} />
            </div>
            <div style={styles.fieldRowSmall}>
              <label style={styles.fieldLabel}>Cook time</label>
              <input type="number" min="0" step="1" value={editValues.cookTime} onChange={handleEditChange('cookTime')} style={styles.fieldInput} />
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

      {(servings || prepMinutes || cookMinutes || totalMinutes || recipeCategory.length || recipeCuisine.length) && (
        <section style={styles.metaGrid} className="single-recipe-card">
          {servings ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Servings</span>
              <span style={styles.metaValue}>{servings}</span>
            </div>
          ) : null}
          {prepMinutes ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Prep Time</span>
              <span style={styles.metaValue}>{formatTime(prepMinutes)}</span>
            </div>
          ) : null}
          {cookMinutes ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Cook Time</span>
              <span style={styles.metaValue}>{formatTime(cookMinutes)}</span>
            </div>
          ) : null}
          {totalMinutes ? (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Total Time</span>
              <span style={styles.metaValue}>{formatTime(totalMinutes)}</span>
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
        <section style={styles.sectionCard} className="single-recipe-card">
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
    maxWidth: '900px',
    margin: '24px auto',
    padding: '24px 28px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#1f2937',
    lineHeight: '1.6',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
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
    backgroundColor: '#ecf8ef',
    border: '1px solid #cfe5d6',
    color: '#246231',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    padding: '8px 14px',
    marginBottom: '20px',
    borderRadius: '999px',
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
    marginBottom: '24px',
    backgroundColor: '#ecf8ef',
    border: '1px solid #d8e8db',
    borderRadius: '12px',
    padding: '20px 24px',
  },
  title: {
    fontSize: '2rem',
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
    gap: '16px',
    backgroundColor: '#ecf8ef',
    border: '1px solid #d8e8db',
    padding: '18px 20px',
    borderRadius: '12px',
    marginBottom: '24px',
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
  shareButton: {
    backgroundColor: '#0f766e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 18px',
    cursor: 'pointer',
    fontWeight: '700',
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
  shareMessage: {
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    marginBottom: '20px',
    fontWeight: '600',
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
    marginBottom: '24px',
    padding: '20px',
    border: '1px solid #dcefe0',
    borderRadius: '12px',
    backgroundColor: '#f9fcfa',
    boxShadow: '0 2px 6px rgba(36, 98, 49, 0.06)',
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
    backgroundColor: '#f9fcfa',
    border: '1px solid #dcefe0',
    padding: '22px 24px',
    borderRadius: '12px',
    boxShadow: '0 2px 6px rgba(36, 98, 49, 0.06)',
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
    padding: '12px 0',
    borderBottom: '1px solid #eef4ee',
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
    borderBottom: '1px solid #eef4ee',
  },
  spinner: {
    fontSize: '1.2rem',
    color: '#4b5563',
  },
};
