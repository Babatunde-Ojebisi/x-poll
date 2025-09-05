import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

// Check if we're running in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create a custom storage implementation that works in both client and server environments
const customStorage = {
  getItem: (key: string) => {
    if (isBrowser) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Error accessing localStorage:', error);
        return null;
      }
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (isBrowser) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Error setting localStorage:', error);
      }
    }
  },
  removeItem: (key: string) => {
    if (isBrowser) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing from localStorage:', error);
      }
    }
  }
};

// Client-side Supabase client
export const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
      flowType: 'pkce',
      storage: customStorage
    },
    global: {
      fetch: (...args) => {
        return fetch(...args).catch(err => {
          console.error('Supabase fetch error:', err);
          // Don't throw the error for logout requests
          if (args[0] && typeof args[0] === 'string' && args[0].includes('/auth/v1/logout')) {
            console.log('Ignoring error for logout request');
            return new Response(JSON.stringify({ error: null }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          throw err;
        });
      }
    }
  }
);

// Server-side Supabase client that uses cookies
export function createClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // This is a read-only cookie store, so we do nothing for set operations
        },
        remove(name: string, options: CookieOptions) {
          // This is a read-only cookie store, so we do nothing for remove operations
        },
      },
    }
  );
}
