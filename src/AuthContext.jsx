import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './utils/supabaseClient.js';

const AuthContext = createContext({ session: null, user: null, loading: true, supabase });

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

  // Check the initial session
  supabase.auth.getSession()
    .then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    })
    .catch(err => {
      setLoading(false); // Safety fallback so app doesn't freeze
    });

  // Listen for auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
    setLoading(false);
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user, loading, supabase }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
