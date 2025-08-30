import { NextRequest, NextResponse } from 'next/server';
import { getPoll, getPollWithResults, deletePoll } from '@/lib/supabase/database';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-helpers';

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
    
    // Delete the poll
    const { success, error } = await deletePoll(pollId);
    
    if (error) {
      return createErrorResponse(error.message);
    }
    
    return createSuccessResponse({ success });
  } catch (error) {
    return createErrorResponse('Failed to delete poll', 500);
  }
}