import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { toSlug } from './utils/helpers';
import { getRecipesUrl } from './utils/supabaseClient';

export default function SingleRecipe() {
  const [searchParams] = useSearchParams();
  const { dataSourceId } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rawParam = searchParams.get('name');

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

        const response = await fetch(getRecipesUrl(dataSourceId));
        if (!response.ok) throw new Error('Failed to fetch recipes from server.');

        const rawData = await response.json();

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
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadRecipeData();
  }, [dataSourceId, rawParam]);

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
    image,
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

        {image && (
          <img
            src={Array.isArray(image) ? image[0] : image}
            alt={displayName}
            style={styles.heroImage}
          />
        )}

        {description && <p style={styles.description}>{description}</p>}
      </header>

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
  heroImage: {
    width: '100%',
    maxHeight: '400px',
    objectFit: 'cover',
    borderRadius: '12px',
    marginBottom: '20px',
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
