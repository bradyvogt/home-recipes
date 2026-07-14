import React, { useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { toSlug } from './utils/helpers';
import { getStorageFileName } from './utils/supabaseClient';

export default function AddRecipe() {
    const { session, loading: authLoading, supabase } = useAuth();
    const navigate = useNavigate();
    const { dataSourceId } = useParams();

    // Active Tab State ('url', 'text', or 'image')
    const [activeTab, setActiveTab] = useState('url');

    // Input states
    const [url, setUrl] = useState('');
    const [freeformText, setFreeformText] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);

    // Submitting loaders per section
    const [submittingUrl, setSubmittingUrl] = useState(false);
    const [submittingText, setSubmittingText] = useState(false);
    const [submittingImages, setSubmittingImages] = useState(false);

    const fileInputRef = useRef(null);

    const storageFileName = getStorageFileName(dataSourceId);

    const getIngestFunctionUrl = (functionName) => {
        return `${functionName}?storageFile=${encodeURIComponent(storageFileName)}`;
    };

    // Helper to handle edge function responses
    const handleEdgeResult = (error, data) => {
        if (error) {
            let displayMessage = error.message;

            try {
                // Attempt to parse nested JSON error from the edge function
                const nestedError = JSON.parse(error.message);
                displayMessage = nestedError.error?.message || error.message;
            } catch (e) {
                // Fallback to original message if not valid JSON
            }

            alert(`Error: ${displayMessage}`);
            return false;
        }

        alert('Recipe successfully added!');

        // Notify the app that recipes should be refetched (e.g., AllRecipes listens for this)
        try { window.dispatchEvent(new Event('recipes:refresh')); } catch (e) { /* ignore in non-browser env */ }

        const recipeName = data?.name || data?.title || 'unknown';
        const recipePath = dataSourceId ? `/${dataSourceId}/recipe?name=${toSlug(recipeName)}` : `/recipe?name=${toSlug(recipeName)}`;
        navigate(recipePath);
        return true;
    };

    // ── Native Browser Compression Utility ──
    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 1200;

                    if (width > height) {
                        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                    } else {
                        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    }, 'image/jpeg', 0.8);
                };
            };
        });
    };

    // ── Submissions ──
    const handleUrlSubmit = async (e) => {
        e.preventDefault();
        if (!url.trim()) return alert('Paste a URL first.');
        setSubmittingUrl(true);
        try {
            const { error, data } = await supabase.functions.invoke(getIngestFunctionUrl('recipe-ingest/url'), { body: { url: url.trim(), storageFile: storageFileName } });
            if (handleEdgeResult(error, data)) setUrl('');
        } catch (err) { alert(err.message); } finally { setSubmittingUrl(false); }
    };

    const handleTextSubmit = async (e) => {
        e.preventDefault();
        if (!freeformText.trim()) return alert('Write something first.');
        setSubmittingText(true);
        try {
            const { error, data } = await supabase.functions.invoke(getIngestFunctionUrl('recipe-ingest/freeform-text'), { body: { text: freeformText.trim(), storageFile: storageFileName } });
            if (handleEdgeResult(error, data)) setFreeformText('');
        } catch (err) { alert(err.message); } finally { setSubmittingText(false); }
    };

    const handleImageSubmit = async () => {
        if (!selectedFiles.length) return alert('Choose at least one photo.');
        setSubmittingImages(true);
        try {
            const form = new FormData();
            const compressionPromises = selectedFiles.map((file) => compressImage(file));
            const optimizedFiles = await Promise.all(compressionPromises);
            optimizedFiles.forEach((file) => form.append('images', file));

            const { error, data } = await supabase.functions.invoke(getIngestFunctionUrl('recipe-ingest/image'), { body: form });
            if (handleEdgeResult(error, data)) setSelectedFiles([]);
        } catch (err) { alert(err.message); } finally { setSubmittingImages(false); }
    };

    // ── Image Array Management ──
    const processFiles = (files) => setSelectedFiles((prev) => [...prev, ...files].slice(0, 3));
    const handleFileChange = (e) => { processFiles(Array.from(e.target.files || [])); e.target.value = ''; };
    const removeImage = (idx) => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));

    if (authLoading) return <div style={styles.container}>Validating login status...</div>;
    if (!session) return <div style={styles.container}>Please log in to add new recipes.</div>;

    return (
        <div style={styles.container}>
            <h2 style={{ textAlign: 'center' }}>Add New Recipe</h2>

            {/* Tab Switcher Buttons */}
            <div style={styles.tabContainer}>
                <button
                    onClick={() => setActiveTab('url')}
                    style={{ ...styles.tab, ...(activeTab === 'url' ? styles.activeTab : {}) }}
                >
                    🌐 Link URL
                </button>
                <button
                    onClick={() => setActiveTab('text')}
                    style={{ ...styles.tab, ...(activeTab === 'text' ? styles.activeTab : {}) }}
                >
                    📝 Text
                </button>
                <button
                    onClick={() => setActiveTab('image')}
                    style={{ ...styles.tab, ...(activeTab === 'image' ? styles.activeTab : {}) }}
                >
                    📷 Photo
                </button>
            </div>

            {/* Conditionally Render Content based on activeTab */}
            <div style={styles.panel}>

                {activeTab === 'url' && (
                    <div>
                        <h3>Import from Web Address</h3>
                        <p style={styles.subtext}>Paste a recipe link, and Gemini will extract the clean details.</p>
                        <div style={styles.inputGroup}>
                            <input
                                type="text"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                style={styles.input}
                            />
                            <button onClick={handleUrlSubmit} disabled={submittingUrl} style={styles.button}>
                                {submittingUrl ? 'Parsing...' : 'Submit URL'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'text' && (
                    <div>
                        <h3>Paste Recipe Text</h3>
                        <p style={styles.subtext}>Dump messy, unorganized notes or screenshots copied into text below.</p>
                        <textarea
                            placeholder="Paste text notes, screen-grabs, or raw ingredients here..."
                            value={freeformText}
                            onChange={(e) => setFreeformText(e.target.value)}
                            style={{ ...styles.input, height: '150px', resize: 'vertical', marginBottom: '1rem' }}
                        />
                        <button onClick={handleTextSubmit} disabled={submittingText} style={styles.button}>
                            {submittingText ? 'Processing...' : 'Submit Text'}
                        </button>
                    </div>
                )}

                {activeTab === 'image' && (
                    <div>
                        <h3>Upload Recipe Photos (Max 3)</h3>
                        <p style={styles.subtext}>Tap box on mobile to capture a live photo or upload from library.</p>

                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault(); setIsDragOver(false);
                                processFiles(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/')));
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                ...styles.dropZone,
                                backgroundColor: isDragOver ? '#e3f2fd' : '#fafafa',
                                borderColor: isDragOver ? '#0070f3' : '#ccc',
                            }}
                        >
                            <p>Drag images here or <strong>tap to select</strong></p>
                            <input
                                type="file" multiple accept="image/*" ref={fileInputRef}
                                onChange={handleFileChange} style={{ display: 'none' }}
                            />
                        </div>

                        <div style={styles.previewContainer}>
                            {selectedFiles.map((file, i) => (
                                <div key={i} style={styles.previewWrap}>
                                    <img src={URL.createObjectURL(file)} alt="preview" style={styles.previewImage} />
                                    <button onClick={() => removeImage(i)} style={styles.removeBtn}>✕</button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleImageSubmit}
                            disabled={submittingImages || selectedFiles.length === 0}
                            style={{ ...styles.button, marginTop: '1rem', width: '100%' }}
                        >
                            {submittingImages ? 'Compressing & Running OCR...' : 'Process Photos'}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}

const styles = {
    container: { maxWidth: '600px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' },
    tabContainer: { display: 'flex', borderBottom: '2px solid #eee', marginBottom: '1.5rem', gap: '4px' },
    tab: { flex: 1, padding: '0.75rem', background: '#f5f5f5', border: '1px solid #eee', borderBottom: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.15s ease' },
    activeTab: { background: '#fff', fontWeight: 'bold', borderborderColor: '#eee', borderBottom: '2px solid #fff', transform: 'translateY(2px)', color: '#0070f3' },
    panel: { padding: '1.5rem', border: '1px solid #eee', borderRadius: '0 0 8px 8px', minHeight: '240px', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    subtext: { color: '#666', fontSize: '0.85rem', marginTop: '-0.25rem', marginBottom: '1.25rem' },
    inputGroup: { display: 'flex', gap: '0.5rem' },
    input: { flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1rem' },
    button: { padding: '0.75rem 1.25rem', borderRadius: '6px', backgroundColor: '#0070f3', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '1rem' },
    dropZone: { border: '2px dashed #ccc', borderRadius: '8px', padding: '2rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease', color: '#555' },
    previewContainer: { display: 'flex', gap: '1rem', marginTop: '1rem' }, previewWrap: { position: 'relative', width: '80px', height: '80px' }, previewImage: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd' }, removeBtn: { position: 'absolute', top: '-6px', right: '-6px', background: '#ff1744', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
};