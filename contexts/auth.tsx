
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { ClientSessionManager } from "@/lib/utils/session-manager";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  extendSession: () => void;
  sessionTimeLeft: number | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  extendSession: () => {},
  sessionTimeLeft: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);

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
          setUser(null);
        } else {
          setUser(user);
        }
      } catch (error: any) {
        // Handle any exceptions during auth
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Initialize session manager
    ClientSessionManager.init();

    // Set up session time tracking
    const updateSessionTime = () => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity && user) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity);
        const timeLeft = Math.max(0, (2 * 60 * 60 * 1000) - timeSinceActivity); // 2 hours inactivity timeout
        setSessionTimeLeft(timeLeft);
      } else {
        setSessionTimeLeft(null);
      }
    };

    // Update session time every minute
    const sessionTimer = setInterval(updateSessionTime, 60000);
    updateSessionTime(); // Initial update

    // Only set up auth listener in browser environment
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    
    try {
      const { data } = supabase.auth.onAuthStateChange(
        (event, session) => {
          const newUser = session?.user ?? null;
          setUser(newUser);
          
          // Handle session events
          if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            if (event === 'SIGNED_OUT') {
              setSessionTimeLeft(null);
              localStorage.removeItem('lastActivity');
            } else if (event === 'TOKEN_REFRESHED' && newUser) {
              // Update activity on token refresh
              localStorage.setItem('lastActivity', Date.now().toString());
              updateSessionTime();
            }
          }
          
          if (event === 'SIGNED_IN' && newUser) {
            // Initialize activity tracking on sign in
            localStorage.setItem('lastActivity', Date.now().toString());
            updateSessionTime();
          }
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
      
      if (sessionTimer) {
        clearInterval(sessionTimer);
      }
    };
  }, [user]);

  const extendSession = () => {
    ClientSessionManager.extendSession();
    // Update local session time
    const timeLeft = 2 * 60 * 60 * 1000; // Reset to 2 hours
    setSessionTimeLeft(timeLeft);
  };

  return (
    <AuthContext.Provider value={{ user, loading, extendSession, sessionTimeLeft }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
