
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we're running in a browser environment
    const isBrowser = typeof window !== 'undefined';
    if (!isBrowser) {
      // In server-side rendering, don't attempt to get user
      setLoading(false);
      return;
    }

    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        
        if (error) {
          // Handle AuthSessionMissingError gracefully
          if (error.message.includes('Auth session missing')) {
            console.log('No active session found');
          } else {
            console.error('Error getting user:', error);
          }
          setUser(null);
        } else {
          setUser(user);
        }
      } catch (error: any) {
        // Handle any exceptions during auth
        if (error?.message?.includes('Auth session missing')) {
          console.log('No active session found');
        } else {
          console.error('Exception getting user:', error);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Only set up auth listener in browser environment
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    
    try {
      const { data } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('Auth state changed:', event);
          setUser(session?.user ?? null);
        }
      );
      authListener = data;
    } catch (error) {
      console.error('Error setting up auth listener:', error);
    }

    return () => {
      if (authListener) {
        try {
          authListener.subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from auth listener:', error);
        }
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
