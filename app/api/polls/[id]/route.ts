import { NextRequest, NextResponse } from 'next/server';
import { getPoll, getPollWithResults, deletePoll } from '@/lib/supabase/database';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-helpers';
import { createClient } from '@/lib/supabase/client';
import { cookies } from 'next/headers';

// GET /api/polls/[id] - Get a specific poll
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pollId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const includeResults = searchParams.get('results') === 'true';
    
    if (includeResults) {
      // Get poll with results
      const { poll, error } = await getPollWithResults(pollId);
      
      if (error) {
        return createErrorResponse(error.message, error.message.includes('not found') ? 404 : 400);
      }
      
      return createSuccessResponse({ poll });
    } else {
      // Get poll with options
      const { poll, error } = await getPoll(pollId);
      
      if (error) {
        return createErrorResponse(error.message, error.message.includes('not found') ? 404 : 400);
      }
      
      return createSuccessResponse({ poll });
    }
  } catch (error) {
    return createErrorResponse('Failed to fetch poll', 500);
  }
}

// DELETE /api/polls/[id] - Delete a poll
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pollId = params.id;
    console.log(`API route: Received DELETE request for poll ID: ${pollId}`);
    
    // Create a Supabase client with cookies for server-side authentication
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Verify authentication before proceeding
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('API route: No authenticated session found');
      return createErrorResponse('Authentication required', 401);
    }
    
    console.log('API route: Authenticated session found, proceeding with deletion');
    
    // Delete the poll
    const { success, error } = await deletePoll(pollId);
    
    if (error) {
      console.error(`API route: Error deleting poll ${pollId}:`, error);
      return createErrorResponse(error.message || 'Failed to delete poll');
    }
    
    console.log(`API route: Successfully deleted poll ${pollId}`);
    return createSuccessResponse({ success });
  } catch (error) {
    console.error('API route: Unhandled exception in DELETE poll:', error);
    return createErrorResponse('Failed to delete poll', 500);
  }
}