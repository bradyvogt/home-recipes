import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate for redirection if desired
import { useAuth } from './AuthContext';

export default function Navbar() {
  const { session, loading, supabase } = useAuth();
  const navigate = useNavigate();

  // Handle the async sign out process
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      alert('You have successfully signed out!');
      navigate('/'); // Optional: redirect user to home page after sign out
    } catch (error) {
      alert(`Error signing out: ${error.message}`);
    }
  };

  // Prevent UI flickering while checking authentication state
  if (loading) {
    return <nav style={styles.nav}>Loading...</nav>; 
  }

  return (
    <nav style={styles.nav}>
      {/* Left Section */}
      <div style={styles.section}>
        <Link to="/add-recipe" style={styles.link}>
          <img src={'./icons/add_recipe.svg'} alt="icon" style={{ width: '30px', height: '30px' }} />
        </Link>
      </div>

      {/* Center Section */}
      <div style={{ ...styles.section, ...styles.center }}>
        <Link to="/" style={styles.logoLink}>
          <span style={styles.logoText}>Recipe Viewer</span>
        </Link>
      </div>

      {/* Right Section */}
      <div style={{ ...styles.section, ...styles.right }}>
        <Link to="/settings" style={styles.link}>
          <img src={'./icons/settings.svg'} alt="icon" style={{ width: '30px', height: '30px' }} />
        </Link>

        {/* Conditional Rendering based on login state */}
        {session ? (
          /* User is logged in: Show active Sign Out button */
          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <img src={'./icons/sign_out.svg'} alt="Sign Out" style={{ width: '30px', height: '30px' }} />
          </button>
        ) : (
          /* User is logged out: Show Link to Sign In page */
          <Link to="/login" style={styles.link}>
            <img src={'./icons/sign_in.svg'} alt="Sign In" style={{ width: '30px', height: '30px' }} />
          </Link>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 2rem',
    height: '60px',
    backgroundColor: '#ecf8ef',
    borderBottom: '1px solid #e0e0e0',
    fontFamily: 'sans-serif',
  },
  section: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
  },
  right: {
    justifyContent: 'flex-end',
    gap: '1.5rem',
  },
  link: {
    textDecoration: 'none',
    color: '#333333',
    fontWeight: '500',
  },
  logoLink: {
    textDecoration: 'none',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#246231',
  },
  authBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#333333',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
  },
};