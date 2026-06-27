import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './utils/supabaseClient.js';

const AuthContext = createContext({ session: null, user: null, loading: true, supabase });

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  console.log("1. AuthContext useEffect triggered");

  // Check the initial session
  supabase.auth.getSession()
    .then(({ data: { session } }) => {
      console.log("2. getSession response received:", session);
      setSession(session);
      setLoading(false);
    })
    .catch(err => {
      console.error("2b. getSession crashed:", err);
      setLoading(false); // Safety fallback so app doesn't freeze
    });

  // Listen for auth state changes
  console.log("3. Setting up onAuthStateChange listener");
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    console.log("4. onAuthStateChange fired! Event:", _event, "Session:", session);
    setSession(session);
    setLoading(false);
  });

  return () => {
    console.log("5. Cleaning up auth subscription");
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
