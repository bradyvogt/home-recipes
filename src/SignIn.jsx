import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useHref } from 'react-router-dom';

function SignIn() {
  const navigate = useNavigate();
  const basePath = useHref('/'); 

  // Pull both state and the central client instance
  const { session, loading, supabase } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      navigate('/'); // Seamless redirect once logged in
    }
  }, [session, loading, navigate]);

  const handleGoogleLogin = async () => {
    console.log(window.location.href);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${basePath}`,
      },
    });

    if (error) {
      console.error('OAuth error:', error.message);
    }
  };

  if (session) {
    return (
      <div style={styles.container}>
        <p>Verifying authentication details...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.subtitle}>Sign in to access your secure workspace</p>
        
        <button onClick={handleGoogleLogin} style={styles.googleBtn}>
          <img 
            src="./icons/google_logo.svg" 
            alt="Google logo"
            style={styles.icon} 
          />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

// Minimalist center-card layout styles
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh',
    fontFamily: 'sans-serif',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '360px',
    border: '1px solid #e5e7eb',
  },
  title: {
    margin: '0 0 0.5rem 0',
    color: '#111827',
    fontSize: '1.75rem',
    fontWeight: '700',
  },
  subtitle: {
    margin: '0 0 2rem 0',
    color: '#6b7280',
    fontSize: '0.95rem',
  },
  googleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s, box-shadow 0.2s',
  },
  icon: {
    width: '18px',
    height: '18px',
  },
};

export default SignIn;