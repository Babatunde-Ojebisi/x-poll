import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { randomBytes, createHash } from 'crypto';

// CSRF token configuration
export const CSRF_CONFIG = {
  TOKEN_LENGTH: 32,
  TOKEN_HEADER: 'X-CSRF-Token',
  TOKEN_COOKIE: 'csrf-token',
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
};

// In-memory store for CSRF tokens (in production, use Redis or database)
interface CSRFToken {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

const csrfTokens = new Map<string, CSRFToken>();

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_CONFIG.TOKEN_LENGTH).toString('hex');
}

/**
 * Create a hash of the token for secure storage
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Store CSRF token for a user
 */
export function storeCSRFToken(userId: string, token: string): void {
  const hashedToken = hashToken(token);
  const now = Date.now();
  
  csrfTokens.set(hashedToken, {
    token: hashedToken,
    userId,
    createdAt: now,
    expiresAt: now + CSRF_CONFIG.TOKEN_EXPIRY,
  });
}

/**
 * Validate CSRF token for a user
 */
export function validateCSRFToken(userId: string, token: string): boolean {
  if (!token || !userId) {
    return false;
  }
  
  const hashedToken = hashToken(token);
  const storedToken = csrfTokens.get(hashedToken);
  
  if (!storedToken) {
    return false;
  }
  
  // Check if token belongs to the user
  if (storedToken.userId !== userId) {
    return false;
  }
  
  // Check if token is expired
  if (Date.now() > storedToken.expiresAt) {
    csrfTokens.delete(hashedToken);
    return false;
  }
  
  return true;
}

/**
 * Clean up expired CSRF tokens
 */
export function cleanupExpiredCSRFTokens(): void {
  const now = Date.now();
  
  for (const [hashedToken, tokenData] of Array.from(csrfTokens.entries())) {
    if (now > tokenData.expiresAt) {
      csrfTokens.delete(hashedToken);
    }
  }
}

/**
 * Generate and set CSRF token for a user session
 */
export async function generateCSRFTokenForUser(request: NextRequest): Promise<{
  token: string | null;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return { token: null, error: 'No authenticated user' };
    }
    
    const token = generateCSRFToken();
    storeCSRFToken(session.user.id, token);
    
    return { token };
  } catch (error: any) {
    return { token: null, error: error.message };
  }
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFTokenFromRequest(request: NextRequest): Promise<{
  isValid: boolean;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return { isValid: false, error: 'No authenticated user' };
    }
    
    // Get token from header
    const tokenFromHeader = request.headers.get(CSRF_CONFIG.TOKEN_HEADER);
    
    // Get token from cookie as fallback
    const tokenFromCookie = request.cookies.get(CSRF_CONFIG.TOKEN_COOKIE)?.value;
    
    const token = tokenFromHeader || tokenFromCookie;
    
    if (!token) {
      return { isValid: false, error: 'CSRF token not provided' };
    }
    
    const isValid = validateCSRFToken(session.user.id, token);
    
    if (!isValid) {
      return { isValid: false, error: 'Invalid or expired CSRF token' };
    }
    
    return { isValid: true };
  } catch (error: any) {
    return { isValid: false, error: error.message };
  }
}

/**
 * Higher-order function to wrap API handlers with CSRF protection
 */
export function withCSRFProtection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: {
    methods?: string[];
    skipForGET?: boolean;
  } = {}
) {
  const { methods = ['POST', 'PUT', 'DELETE', 'PATCH'], skipForGET = true } = options;
  
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const method = request.method;
    
    // Skip CSRF protection for safe methods if configured
    if (skipForGET && method === 'GET') {
      return handler(request, ...args);
    }
    
    // Only apply CSRF protection to specified methods
    if (!methods.includes(method)) {
      return handler(request, ...args);
    }
    
    // Validate CSRF token
    const validation = await validateCSRFTokenFromRequest(request);
    
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'CSRF validation failed',
          message: validation.error,
          code: 'CSRF_INVALID',
        },
        { status: 403 }
      );
    }
    
    // Add CSRF validation info to request headers
    const requestWithCSRF = new NextRequest(request, {
      headers: {
        ...request.headers,
        'x-csrf-validated': 'true',
      },
    });
    
    const response = await handler(requestWithCSRF, ...args);
    
    // Add CSRF status to response headers
    response.headers.set('X-CSRF-Protected', 'true');
    
    return response;
  };
}

/**
 * Create a response with CSRF token in cookie
 */
export function setCSRFTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_CONFIG.TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_CONFIG.TOKEN_EXPIRY / 1000, // Convert to seconds
    path: '/',
  });
}

/**
 * Client-side utilities for CSRF protection
 */
export const ClientCSRFManager = {
  /**
   * Get CSRF token from cookie or fetch from server
   */
  async getCSRFToken(): Promise<string | null> {
    // Try to get token from cookie first
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${CSRF_CONFIG.TOKEN_COOKIE}=`)
    );
    
    if (csrfCookie) {
      return csrfCookie.split('=')[1];
    }
    
    // If no cookie, fetch from server
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.token;
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
    
    return null;
  },
  
  /**
   * Add CSRF token to fetch request headers
   */
  async addCSRFHeader(headers: HeadersInit = {}): Promise<HeadersInit> {
    const token = await this.getCSRFToken();
    
    if (token) {
      return {
        ...headers,
        [CSRF_CONFIG.TOKEN_HEADER]: token,
      };
    }
    
    return headers;
  },
  
  /**
   * Make a CSRF-protected fetch request
   */
  async protectedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = await this.addCSRFHeader(options.headers);
    
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  },
};

/**
 * React hook for CSRF protection
 */
export function useCSRFProtection() {
  const getProtectedHeaders = async (headers: HeadersInit = {}): Promise<HeadersInit> => {
    return ClientCSRFManager.addCSRFHeader(headers);
  };
  
  const protectedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    return ClientCSRFManager.protectedFetch(url, options);
  };
  
  return {
    getProtectedHeaders,
    protectedFetch,
  };
}

// Cleanup interval (run every hour)
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredCSRFTokens, 60 * 60 * 1000);
}