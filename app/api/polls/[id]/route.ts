import { NextRequest, NextResponse } from 'next/server';
import { getPoll, getPollWithResults, deletePoll } from '@/lib/supabase/database';
import { createClient } from '@/lib/supabase/client';
import { cookies } from 'next/headers';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/middleware/rate-limit';
import { ErrorFactory, createErrorResponse as createSecureErrorResponse, generateRequestId, withErrorHandling } from '@/lib/utils/error-handler';
import { withCSRFProtection } from '@/lib/utils/csrf-protection';

// GET /api/polls/[id] - Get a specific poll
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const requestId = generateRequestId();
  
  // Validate poll ID format (should be UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.id)) {
    throw ErrorFactory.validation('Invalid poll ID format', 'The poll ID provided is not valid.', requestId);
  }
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { session } } = await supabase.auth.getSession();
  
  try {
    let poll;
    
    if (session && session.user) {
      // User is authenticated, get poll with results
      const { poll: pollData, error } = await getPollWithResults(params.id);
      if (error) {
        if (error.message?.includes('not found')) {
          throw ErrorFactory.notFound('Poll', requestId);
        }
        throw ErrorFactory.database(`Failed to fetch poll with results: ${error.message}`, requestId);
      }
      poll = pollData;
    } else {
      // User is not authenticated, get basic poll info
      const { poll: pollData, error } = await getPoll(params.id);
      if (error) {
        if (error.message?.includes('not found')) {
          throw ErrorFactory.notFound('Poll', requestId);
        }
        throw ErrorFactory.database(`Failed to fetch poll: ${error.message}`, requestId);
      }
      poll = pollData;
    }
    
    const response = NextResponse.json(poll, { status: 200 });
    response.headers.set('X-Request-ID', requestId);
    
    return response;
  } catch (error: any) {
    // If it's already an AppError, re-throw it
    if (error.type) {
      throw error;
    }
    
    throw ErrorFactory.database(`Failed to fetch poll: ${error.message}`, requestId);
  }
});

// DELETE /api/polls/[id] - Delete a poll
export const DELETE = withCSRFProtection(withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const requestId = generateRequestId();
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw ErrorFactory.authentication('User session not found', requestId);
  }

  // Check rate limit for deletion
  const rateLimitResult = checkRateLimit(request, 'default', session.user.id);
  if (!rateLimitResult.success) {
    const headers = createRateLimitHeaders(rateLimitResult);
    const response = createSecureErrorResponse(
      ErrorFactory.rateLimit('Poll deletion rate limit exceeded', rateLimitResult.retryAfter, requestId),
      requestId
    );
    
    // Add rate limit headers
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }

  // Validate poll ID format (should be UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.id)) {
    throw ErrorFactory.validation('Invalid poll ID format', 'The poll ID provided is not valid.', requestId);
  }

  try {
    const result = await deletePoll(params.id, session.user.id);

    if (result.error) {
      if (result.error === 'Poll not found or unauthorized') {
        throw ErrorFactory.authorization('You are not authorized to delete this poll or it does not exist.', requestId);
      }
      
      throw ErrorFactory.validation(`Poll deletion failed: ${result.error}`, result.error, requestId);
    }

    const response = NextResponse.json(
      { message: 'Poll deleted successfully' },
      { status: 200 }
    );
    
    // Add rate limit headers to response
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Add request ID to response headers
    response.headers.set('X-Request-ID', requestId);

    return response;
  } catch (error: any) {
    // If it's already an AppError, re-throw it
    if (error.type) {
      throw error;
    }
    
    // Handle database-specific errors
    if (error.code === '23503') {
      throw ErrorFactory.database('Cannot delete poll due to existing references', requestId);
    }
    
    throw ErrorFactory.database(`Failed to delete poll: ${error.message}`, requestId);
  }
}));