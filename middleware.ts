import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/client';
import { validateAndRefreshSession, cleanupExpiredSessions } from '@/lib/utils/session-manager';

export async function middleware(request: NextRequest) {
  // Generate nonce for inline scripts and styles
  const nonce = randomBytes(16).toString('base64');
  
  let response = NextResponse.next();
  const headers = response.headers;
  
  // Clean up expired sessions periodically
  if (Math.random() < 0.01) { // 1% chance to run cleanup
    cleanupExpiredSessions();
  }
  
  // Session validation for protected routes
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = pathname.startsWith('/polls') || pathname.startsWith('/api/polls');
  const isAuthRoute = pathname.startsWith('/auth');
  
  if (isProtectedRoute && !isAuthRoute) {
    try {
      const sessionValidation = await validateAndRefreshSession(request);
      
      if (!sessionValidation.isValid) {
        // Redirect to login for page requests
        if (!pathname.startsWith('/api/')) {
          const loginUrl = new URL('/auth/login', request.url);
          loginUrl.searchParams.set('redirect', pathname);
          loginUrl.searchParams.set('reason', 'session_required');
          return NextResponse.redirect(loginUrl);
        }
        
        // Return 401 for API requests
        return NextResponse.json(
          {
            error: 'Session invalid',
            message: sessionValidation.error,
            code: 'SESSION_INVALID',
          },
          { status: 401 }
        );
      }
      
      // Add session headers for valid sessions
      response.headers.set('X-Session-Valid', 'true');
      if (sessionValidation.shouldRefresh) {
        response.headers.set('X-Should-Refresh-Session', 'true');
      }
    } catch (error) {
      console.error('Session validation error:', error);
      
      // Handle session validation errors gracefully
      if (!pathname.startsWith('/api/')) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        loginUrl.searchParams.set('reason', 'session_error');
        return NextResponse.redirect(loginUrl);
      }
      
      return NextResponse.json(
        {
          error: 'Session validation failed',
          code: 'SESSION_ERROR',
        },
        { status: 500 }
      );
    }
  }
  
  // CORS Headers - More restrictive
  const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  // More restrictive Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co'}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ];
  
  headers.set('Content-Security-Policy', cspDirectives.join('; '));
  
  // Store nonce for use in components (if needed)
  response.headers.set('X-Nonce', nonce);

  // XSS Protection (deprecated but still useful for older browsers)
  headers.set('X-XSS-Protection', '1; mode=block');

  // Content Type Options
  headers.set('X-Content-Type-Options', 'nosniff');

  // Frame Options (redundant with CSP frame-ancestors but kept for compatibility)
  headers.set('X-Frame-Options', 'DENY');

  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // More comprehensive Permissions Policy
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()'
  );

  // Strict Transport Security
  headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Cross-Origin Embedder Policy
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  
  // Cross-Origin Opener Policy
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Cross-Origin Resource Policy
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  
  // Remove server information
  headers.delete('Server');
  headers.delete('X-Powered-By');
  
  // Cache Control for sensitive pages
  if (request.nextUrl.pathname.includes('/auth') || request.nextUrl.pathname.includes('/polls')) {
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
  }

  return response;
}

// Only run middleware on the frontend routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};