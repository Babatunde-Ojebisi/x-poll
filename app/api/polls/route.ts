import { NextRequest, NextResponse } from 'next/server';
import { createPoll, getPublicPolls, getUserPolls } from '@/lib/supabase/database';
import { createErrorResponse, createSuccessResponse, validatePollInput } from '@/lib/utils/api-helpers';
import { createClient } from '@/lib/supabase/client';
import { cookies } from 'next/headers';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/middleware/rate-limit';
import { ErrorFactory, createErrorResponse as createSecureErrorResponse, generateRequestId, withErrorHandling } from '@/lib/utils/error-handler';
import { withCSRFProtection } from '@/lib/utils/csrf-protection';

// GET /api/polls - Get all polls (public or user's polls)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'public';
  
  try {
    if (type === 'user') {
      // Get user's polls
      const { polls, error } = await getUserPolls();
      
      if (error) {
        return createErrorResponse(error.message);
      }
      
      return createSuccessResponse({ polls });
    } else {
      // Get public polls
      const { polls, error } = await getPublicPolls();
      
      if (error) {
        return createErrorResponse(error.message);
      }
      
      return createSuccessResponse({ polls });
    }
  } catch (error) {
    return createErrorResponse('Failed to fetch polls', 500);
  }
}

// POST /api/polls - Create a new poll
export const POST = withCSRFProtection(withErrorHandling(async (request: NextRequest) => {
  const requestId = generateRequestId();
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw ErrorFactory.authentication('User session not found', requestId);
  }

  // Check rate limit for poll creation
  const rateLimitResult = checkRateLimit(request, 'createPoll', session.user.id);
  if (!rateLimitResult.success) {
    const headers = createRateLimitHeaders(rateLimitResult);
    const response = createSecureErrorResponse(
      ErrorFactory.rateLimit('Poll creation rate limit exceeded', rateLimitResult.retryAfter, requestId),
      requestId
    );
    
    // Add rate limit headers
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }

  const body = await request.json().catch(() => {
    throw ErrorFactory.validation('Invalid JSON in request body', 'Please provide valid JSON data.', requestId);
  });
  
  // Validate and sanitize input
  const validation = validatePollInput(body);
  if (!validation.isValid) {
    throw ErrorFactory.validation(`Poll validation failed: ${validation.error}`, validation.error, requestId);
  }

  const { title, description, expires_at, options } = validation.sanitizedData!;

  try {
    const poll = await createPoll({
      title,
      description,
      expires_at,
      options,
    });

    const response = NextResponse.json(poll, { status: 201 });
    
    // Add rate limit headers to response
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Add request ID to response headers
    response.headers.set('X-Request-ID', requestId);

    return response;
  } catch (error: any) {
    if (error.message?.includes('duplicate') || error.code === '23505') {
      throw ErrorFactory.validation('Duplicate poll detected', 'A poll with similar content already exists.', requestId);
    }
    
    throw ErrorFactory.database(`Failed to create poll: ${error.message}`, requestId);
  }
}));