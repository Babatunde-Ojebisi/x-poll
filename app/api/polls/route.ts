import { NextRequest, NextResponse } from 'next/server';
import { createPoll, getPublicPolls, getUserPolls } from '@/lib/supabase/database';
import { createErrorResponse, createSuccessResponse, validateRequiredFields, validateFutureDate } from '@/lib/utils/api-helpers';

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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, expires_at, options } = body;
    
    // Validate required fields
    const validationError = validateRequiredFields(body, ['title', 'options']);
    if (validationError) {
      return createErrorResponse(validationError);
    }
    
    if (!Array.isArray(options) || options.length < 2) {
      return createErrorResponse('At least two options are required');
    }
    
    // Parse expiration date if provided
    let parsedExpiresAt = null;
    if (expires_at) {
      const { isValid, parsedDate } = validateFutureDate(expires_at);
      if (!isValid) {
        return createErrorResponse('Expiration date must be in the future');
      }
      parsedExpiresAt = parsedDate;
    }
    
    // Create the poll
    const { poll, error } = await createPoll({
      title,
      description: description || null,
      expires_at: parsedExpiresAt?.toISOString() || null,
      options
    });
    
    if (error) {
      return createErrorResponse(error.message);
    }
    
    return createSuccessResponse({ poll }, 201);
  } catch (error) {
    return createErrorResponse('Failed to create poll', 500);
  }
}