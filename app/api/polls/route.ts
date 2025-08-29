import { NextRequest, NextResponse } from 'next/server';
import { createPoll, getPublicPolls, getUserPolls } from '@/lib/supabase/database';

// GET /api/polls - Get all polls (public or user's polls)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'public';
  
  try {
    if (type === 'user') {
      // Get user's polls
      const { polls, error } = await getUserPolls();
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      return NextResponse.json({ polls });
    } else {
      // Get public polls
      const { polls, error } = await getPublicPolls();
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      return NextResponse.json({ polls });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch polls' },
      { status: 500 }
    );
  }
}

// POST /api/polls - Create a new poll
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, end_date, is_public, allow_multiple_votes, options } = body;
    
    // Validate required fields
    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: 'Title and at least two options are required' },
        { status: 400 }
      );
    }
    
    // Parse end date if provided
    let parsedEndDate = null;
    if (end_date) {
      parsedEndDate = new Date(end_date);
      
      // Validate end date is in the future
      if (parsedEndDate <= new Date()) {
        return NextResponse.json(
          { error: 'End date must be in the future' },
          { status: 400 }
        );
      }
    }
    
    // Create the poll
    const { poll, error } = await createPoll({
      title,
      description: description || null,
      end_date: parsedEndDate?.toISOString() || null,
      is_public: is_public !== false, // Default to true if not specified
      allow_multiple_votes: allow_multiple_votes === true, // Default to false if not specified
      options
    });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create poll' },
      { status: 500 }
    );
  }
}