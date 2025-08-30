import { NextRequest, NextResponse } from 'next/server';
import { castVote, hasUserVoted, getPoll } from '@/lib/supabase/database';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// POST /api/polls/[id]/vote - Cast a vote for a poll option
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pollId = params.id;
    const body = await request.json();
    const { optionId } = body;
    
    // Validate required fields
    if (!optionId) {
      return NextResponse.json(
        { error: 'Option ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the poll exists
    const { poll, error: pollError } = await getPoll(pollId);
    
    if (pollError || !poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }
    
    // Check if the poll has ended
    if (poll.end_date && new Date(poll.end_date) < new Date()) {
      return NextResponse.json(
        { error: 'This poll has ended' },
        { status: 400 }
      );
    }
    
    // For anonymous users, use a cookie to track their ID
    let anonymousId = cookies().get('anonymous_user_id')?.value;
    
    if (!anonymousId) {
      anonymousId = uuidv4();
      // In a real app, you would set this cookie in the response
      // Since we're using Next.js API routes, we need to handle this differently
    }
    
    // Check if the user has already voted (unless multiple votes are allowed)
    if (!poll.allow_multiple_votes) {
      const { hasVoted, error: voteCheckError } = await hasUserVoted(pollId, anonymousId);
      
      if (voteCheckError) {
        return NextResponse.json(
          { error: voteCheckError.message },
          { status: 400 }
        );
      }
      
      if (hasVoted) {
        return NextResponse.json(
          { error: 'You have already voted in this poll' },
          { status: 400 }
        );
      }
    }
    
    // Cast the vote
    const { success, error } = await castVote(pollId, optionId, anonymousId);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ hasVoted });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check vote status' },
      { status: 500 }
    );
  }
}