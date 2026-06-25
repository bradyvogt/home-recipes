import React from 'react';

import { Link } from 'react-router-dom';

export default function Navbar({ isLoggedIn, onAuthClick }) {
  return (
    <nav style={styles.nav}>
      {/* Left Section */}
      <div style={styles.section}>
        <Link href="/add-recipe" style={styles.link}>Add Recipe</Link>
      </div>

      {/* Center Section */}
      <div style={{ ...styles.section, ...styles.center }}>
        <Link href="/" style={styles.logoLink}>
          <span style={styles.logoText}>Recipe Viewer</span>
        </Link>
      </div>

      {/* Right Section */}
      <div style={{ ...styles.section, ...styles.right }}>
        <Link href="/settings" style={styles.link}>Settings</Link>
        <button onClick={onAuthClick} style={styles.authBtn}>
          {isLoggedIn ? 'Sign Out' : 'Sign In'}
        </button>
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
