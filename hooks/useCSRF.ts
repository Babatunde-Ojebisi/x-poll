import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';

/**
 * Custom hook for CSRF protection in React components
 */
export function useCSRF() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  /**
   * Fetch CSRF token from the server
   */
  const fetchCSRFToken = useCallback(async () => {
    if (!user) {
      setCsrfToken(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      setCsrfToken(data.token);
    } catch (err: any) {
      setError(err.message);
      setCsrfToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Get CSRF token, fetching if necessary
   */
  const getCSRFToken = useCallback(async (): Promise<string | null> => {
    if (!user) {
      return null;
    }

    if (csrfToken) {
      return csrfToken;
    }

    await fetchCSRFToken();
    return csrfToken;
  }, [user, csrfToken, fetchCSRFToken]);

  /**
   * Create headers with CSRF token
   */
  const getProtectedHeaders = useCallback(async (additionalHeaders: HeadersInit = {}): Promise<HeadersInit> => {
    const token = await getCSRFToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    if (token) {
      (headers as Record<string, string>)['X-CSRF-Token'] = token;
    }

    return headers;
  }, [getCSRFToken]);

  /**
   * Make a protected fetch request with CSRF token
   */
  const protectedFetch = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    const headers = await getProtectedHeaders(options.headers);
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // If we get a CSRF error, try to refresh the token and retry once
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.code === 'CSRF_INVALID') {
        await fetchCSRFToken();
        const newHeaders = await getProtectedHeaders(options.headers);
        
        return fetch(url, {
          ...options,
          headers: newHeaders,
          credentials: 'include',
        });
      }
    }

    return response;
  }, [getProtectedHeaders, fetchCSRFToken]);

  /**
   * Submit form data with CSRF protection
   */
  const submitForm = useCallback(async (
    url: string,
    data: any,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
  ): Promise<Response> => {
    return protectedFetch(url, {
      method,
      body: JSON.stringify(data),
    });
  }, [protectedFetch]);

  /**
   * Create a poll with CSRF protection
   */
  const createPoll = useCallback(async (pollData: {
    title: string;
    description?: string;
    options: string[];
    expiresAt?: string;
  }): Promise<Response> => {
    return submitForm('/api/polls', pollData, 'POST');
  }, [submitForm]);

  /**
   * Vote on a poll with CSRF protection
   */
  const votePoll = useCallback(async (pollId: string, optionId: string): Promise<Response> => {
    return submitForm(`/api/polls/${pollId}/vote`, { optionId }, 'POST');
  }, [submitForm]);

  /**
   * Delete a poll with CSRF protection
   */
  const deletePoll = useCallback(async (pollId: string): Promise<Response> => {
    return protectedFetch(`/api/polls/${pollId}`, {
      method: 'DELETE',
    });
  }, [protectedFetch]);

  // Fetch CSRF token when user changes
  useEffect(() => {
    if (user && !csrfToken) {
      fetchCSRFToken();
    } else if (!user) {
      setCsrfToken(null);
      setError(null);
    }
  }, [user, csrfToken, fetchCSRFToken]);

  return {
    csrfToken,
    isLoading,
    error,
    fetchCSRFToken,
    getCSRFToken,
    getProtectedHeaders,
    protectedFetch,
    submitForm,
    createPoll,
    votePoll,
    deletePoll,
  };
}

export default useCSRF;