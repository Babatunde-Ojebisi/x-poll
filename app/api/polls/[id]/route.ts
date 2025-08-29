import { NextRequest, NextResponse } from 'next/server';
import { getPoll, getPollWithResults, deletePoll } from '@/lib/supabase/database';

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
        return NextResponse.json(
          { error: error.message },
          { status: error.message.includes('not found') ? 404 : 400 }
        );
      }
      
      return NextResponse.json({ poll });
    } else {
      // Get poll with options
      const { poll, error } = await getPoll(pollId);
      
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: error.message.includes('not found') ? 404 : 400 }
        );
      }
      
      return NextResponse.json({ poll });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch poll' },
      { status: 500 }
    );
  }
}

// DELETE /api/polls/[id] - Delete a poll
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pollId = params.id;
    
    // Delete the poll
    const { success, error } = await deletePoll(pollId);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete poll' },
      { status: 500 }
    );
  }
}