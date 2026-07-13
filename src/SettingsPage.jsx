import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStoredDataSourceId, listDataSourceFiles, setStoredDataSourceId } from './utils/supabaseClient';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { dataSourceId } = useParams();
  const [availableDataSources, setAvailableDataSources] = useState([]);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState(dataSourceId || getStoredDataSourceId() || 'recipes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const initializeSelection = async () => {
      const initialSelection = dataSourceId || getStoredDataSourceId() || 'recipes';
      setSelectedDataSourceId(initialSelection);

      try {
        const datasourceIds = await listDataSourceFiles();
        const uniqueDatasourceIds = [...new Set(datasourceIds)];
        setAvailableDataSources(uniqueDatasourceIds);

        if (!uniqueDatasourceIds.includes(initialSelection) && initialSelection !== 'recipes') {
          setSelectedDataSourceId('recipes');
        }
      } catch (storageError) {
        setError(storageError.message || 'Unable to load datasources from storage.');
      } finally {
        setLoading(false);
      }
    };

    initializeSelection();
  }, [dataSourceId]);

  const handleSelectDataSource = (nextDataSourceId) => {
    setSelectedDataSourceId(nextDataSourceId);

    if (nextDataSourceId === 'recipes') {
      setStoredDataSourceId('');
    } else {
      setStoredDataSourceId(nextDataSourceId);
    }

    navigate(nextDataSourceId && nextDataSourceId !== 'recipes' ? `/${nextDataSourceId}` : '/recipes');
  };

  const options = ['recipes', ...availableDataSources.filter((id) => id !== 'recipes')];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Datasource settings</h2>
        <p style={styles.subtitle}>Choose which recipe datasource should be used by default.</p>

        {loading ? (
          <p style={styles.status}>Loading datasources…</p>
        ) : error ? (
          <p style={styles.error}>{error}</p>
        ) : (
          <div style={styles.list}>
            {options.map((option) => {
              const isSelected = selectedDataSourceId === option;
              const label = option === 'recipes' ? 'Default recipes' : option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelectDataSource(option)}
                  style={{ ...styles.option, ...(isSelected ? styles.optionSelected : {}) }}
                >
                  <span style={styles.optionLabel}>{label}</span>
                  {isSelected ? <span style={styles.selectedBadge}>Active</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    padding: '2rem 1rem',
  },
  card: {
    width: '100%',
    maxWidth: '720px',
    background: '#ffffff',
    border: '1px solid #dcefe2',
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(36, 98, 49, 0.08)',
    padding: '1.5rem',
  },
  title: {
    margin: '0 0 0.5rem',
    color: '#246231',
  },
  subtitle: {
    margin: '0 0 1.25rem',
    color: '#4d4d4d',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  option: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.9rem 1rem',
    borderRadius: '10px',
    border: '1px solid #cfe7d5',
    background: '#f7fcf8',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#1f3d24',
  },
  optionSelected: {
    background: '#e0f5e5',
    borderColor: '#246231',
  },
  optionLabel: {
    fontWeight: 600,
  },
  selectedBadge: {
    background: '#246231',
    color: '#ffffff',
    borderRadius: '999px',
    padding: '0.25rem 0.6rem',
    fontSize: '0.85rem',
  },
  status: {
    color: '#4d4d4d',
    margin: 0,
  },
  error: {
    color: '#b42318',
    margin: 0,
  },
};

export default SettingsPage;
