import { NextRequest, NextResponse } from 'next/server';
import { castVote } from '@/lib/supabase/database';
import { validateVoteInput } from '@/lib/utils/api-helpers';
import { createClient } from '@/lib/supabase/client';
import { cookies } from 'next/headers';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/middleware/rate-limit';
import { ErrorFactory, createErrorResponse as createSecureErrorResponse, generateRequestId, withErrorHandling } from '@/lib/utils/error-handler';
import { withCSRFProtection } from '@/lib/utils/csrf-protection';

export const POST = withCSRFProtection(withErrorHandling(async (
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

  // Check rate limit for voting
  const rateLimitResult = checkRateLimit(request, 'vote', session.user.id);
  if (!rateLimitResult.success) {
    const headers = createRateLimitHeaders(rateLimitResult);
    const response = createSecureErrorResponse(
      ErrorFactory.rateLimit('Voting rate limit exceeded', rateLimitResult.retryAfter, requestId),
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
  const validation = validateVoteInput(body);
  if (!validation.isValid) {
    throw ErrorFactory.validation(`Vote validation failed: ${validation.error}`, validation.error, requestId);
  }

  const { optionId } = validation.sanitizedData!;

  // Validate poll ID format (should be UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.id)) {
    throw ErrorFactory.validation('Invalid poll ID format', 'The poll ID provided is not valid.', requestId);
  }

  try {
    const result = await castVote(
      params.id.toLowerCase(),
      optionId
    );

    if (!result.success || result.error) {
      if (result.error?.message?.includes('already voted')) {
        throw ErrorFactory.validation('Duplicate vote attempt', 'You have already voted in this poll.', requestId);
      }
      if (result.error?.message?.includes('not found')) {
        throw ErrorFactory.notFound('Poll or option', requestId);
      }
      if (result.error?.message?.includes('expired')) {
        throw ErrorFactory.validation('Poll expired', 'This poll has expired and no longer accepts votes.', requestId);
      }
      
      throw ErrorFactory.validation(`Vote processing failed: ${result.error?.message || 'Unknown error'}`, result.error?.message || 'Unknown error', requestId);
    }

    const response = NextResponse.json({ success: true, message: 'Vote cast successfully' }, { status: 201 });
    
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
      throw ErrorFactory.notFound('Poll or option', requestId);
    }
    
    throw ErrorFactory.database(`Failed to process vote: ${error.message}`, requestId);
  }
}));