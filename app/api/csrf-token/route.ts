import { NextRequest, NextResponse } from 'next/server';
import { 
  generateCSRFTokenForUser, 
  setCSRFTokenCookie,
  withErrorHandling,
  ErrorFactory
} from '@/lib/utils';

/**
 * GET /api/csrf-token
 * Generate and return a CSRF token for the authenticated user
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    const { token, error } = await generateCSRFTokenForUser(request);
    
    if (!token || error) {
      throw ErrorFactory.authentication('Authentication required to generate CSRF token');
    }
    
    const response = NextResponse.json(
      {
        success: true,
        token,
        message: 'CSRF token generated successfully',
      },
      { status: 200 }
    );
    
    // Set CSRF token in HTTP-only cookie
    setCSRFTokenCookie(response, token);
    
    // Add security headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error: any) {
    throw ErrorFactory.internal('Failed to generate CSRF token');
  }
});