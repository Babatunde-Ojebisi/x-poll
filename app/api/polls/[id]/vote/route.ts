import { NextRequest, NextResponse } from 'next/server';
import { castVote, hasUserVoted, getPoll } from '@/lib/supabase/database';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { createErrorResponse, createSuccessResponse, validateRequiredFields } from '@/lib/utils/api-helpers';

// POST /api/polls/[id]/vote - Cast a vote for a poll option
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pollId = params.id;
    const body = await request.json();
    const { optionId } = body;
    
    // Validate required fields
    const validationError = validateRequiredFields(body, ['optionId']);
    if (validationError) {
      return createErrorResponse(validationError);
    }
    
    // Check if the poll exists
    const { poll, error: pollError } = await getPoll(pollId);
    
    if (pollError || !poll) {
      return createErrorResponse('Poll not found', 404);
    }
    
    // Check if the poll has expired
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      return createErrorResponse('This poll has expired');
    }
    
    // For anonymous users, use a cookie to track their ID
    let anonymousId = cookies().get('anonymous_user_id')?.value;
    
    if (!anonymousId) {
      anonymousId = uuidv4();
      // In a real app, you would set this cookie in the response
      // Since we're using Next.js API routes, we need to handle this differently
    }
    
    // Check if the user has already voted (one vote per user per poll)
    const { hasVoted, error: voteCheckError } = await hasUserVoted(pollId, anonymousId);
    
    if (voteCheckError) {
      return createErrorResponse(voteCheckError.message);
    }
    
    if (hasVoted) {
      return createErrorResponse('You have already voted in this poll');
    }
    
    // Cast the vote
    const { success, error } = await castVote(pollId, optionId, anonymousId);
    
    if (error) {
      return createErrorResponse(error.message);
    }
    
    // Set the anonymous ID cookie in the response
    const response = NextResponse.json({ success }, { status: 201 });
    if (anonymousId) {
      response.cookies.set('anonymous_user_id', anonymousId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/'
      });
    }
    
    return response;
  } catch (error) {
    return createErrorResponse('Failed to cast vote', 500);
  }
}

// GET /api/polls/[id]/vote - Check if the user has voted
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pollId = params.id;
    
    // For anonymous users, use a cookie to track their ID
    const anonymousId = cookies().get('anonymous_user_id')?.value;
    
    // Check if the user has already voted
    const { hasVoted, error } = await hasUserVoted(pollId, anonymousId);
    
    if (error) {
      return createErrorResponse(error.message);
    }
    
    return createSuccessResponse({ hasVoted });
  } catch (error) {
    return createErrorResponse('Failed to check vote status', 500);
  }
}