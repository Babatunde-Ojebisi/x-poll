import { Poll, PollOption, Vote, PollResult, PollWithOptions, PollWithResults } from '../../types/supabase';
import { supabase } from './client';

// Note: We're now importing the supabase client from './client.ts'
// This allows us to use either the browser client or server client as needed

// Helper function to get authenticated user
async function getAuthenticatedUser(): Promise<{ user: any; error: any }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Auth error:', userError.message);
      return { user: null, error: userError };
    }
    
    if (!user) {
      console.error('No user found');
      return { user: null, error: new Error('User not authenticated') };
    }
    
    return { user, error: null };
  } catch (error) {
    console.error('Exception in getAuthenticatedUser:', error);
    return { user: null, error: error || new Error('Authentication error') };
  }
}

// Helper function to get poll by ID
async function fetchPollById(pollId: string): Promise<{ poll: Poll | null; error: any }> {
  const { data: pollData, error: pollError } = await supabase
    .from('polls')
    .select('*')
    .eq('id', pollId)
    .single();
  
  if (pollError || !pollData) {
    return { poll: null, error: pollError || new Error('Poll not found') };
  }
  
  return { poll: pollData as Poll, error: null };
}

// Helper function to check if a table exists
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableName)
      .single();
    
    return !error && !!data;
  } catch (error) {
    console.error('Error checking table existence:', error);
    return false;
  }
}

// Poll related functions
export async function createPoll(pollInput: {
  title: string,
  description?: string | null,
  expires_at?: string | null,
  options: string[]
}): Promise<{ poll: Poll | null; error: any }> {
  try {
    // Get the current user with detailed session info
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('Auth Debug Info:', {
      user: user ? { id: user.id, email: user.email } : null,
      session: session ? { access_token: session.access_token ? 'present' : 'missing' } : null,
      userError,
      sessionError
    });
    
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return { poll: null, error: userError || new Error('User not authenticated. Please sign in first.') };
    }
    
    if (!session) {
      console.error('No active session found');
      return { poll: null, error: new Error('No active session. Please sign in again.') };
    }
    
    // Insert the poll with explicit user_id
    const pollData = {
      title: pollInput.title,
      description: pollInput.description || null,
      expires_at: pollInput.expires_at || null,
      user_id: user.id
    };
    
    console.log('Attempting to insert poll:', pollData);
    
    const { data: insertedPoll, error: pollError } = await supabase
      .from('polls')
      .insert(pollData)
      .select()
      .single();
    
    if (pollError) {
      console.error('Poll insertion error:', pollError);
      if (pollError.message?.includes('row-level security policy')) {
        return { 
          poll: null, 
          error: new Error('Authentication error: Please ensure you are signed in and try refreshing the page. If the issue persists, contact support.') 
        };
      }
      return { poll: null, error: pollError };
    }
    
    if (!insertedPoll) {
      return { poll: null, error: new Error('Failed to create poll - no data returned') };
    }
    
    // Insert the options
    const optionsToInsert = pollInput.options.map(option => ({
      poll_id: insertedPoll.id,
      option_text: option
    }));
    
    console.log('Attempting to insert options:', optionsToInsert);
    
    const { error: optionsError } = await supabase
      .from('poll_options')
      .insert(optionsToInsert);
    
    if (optionsError) {
      console.error('Options insertion error:', optionsError);
      return { poll: null, error: optionsError };
    }
    
    console.log('Poll created successfully:', insertedPoll);
    return { poll: insertedPoll as Poll, error: null };
  } catch (error) {
    console.error('Error creating poll:', error);
    return { poll: null, error };
  }
}

export async function getPoll(pollId: string): Promise<{ poll: PollWithOptions | null; error: any }> {
  try {
    // Get the poll using helper
    const { poll: pollData, error: pollError } = await fetchPollById(pollId);
    
    if (pollError || !pollData) {
      return { poll: null, error: pollError };
    }
    
    // Get the options
    const { data: optionsData, error: optionsError } = await supabase
      .from('poll_options')
      .select('*')
      .eq('poll_id', pollId);
    
    if (optionsError) {
      return { poll: null, error: optionsError };
    }
    
    const pollWithOptions: PollWithOptions = {
      ...pollData,
      options: optionsData as PollOption[]
    };
    
    return { poll: pollWithOptions, error: null };
  } catch (error) {
    return { poll: null, error };
  }
}

export async function getPollWithResults(pollId: string): Promise<{ poll: PollWithResults | null; error: any }> {
  try {
    // Get the poll using helper
    const { poll: pollData, error: pollError } = await fetchPollById(pollId);
    
    if (pollError || !pollData) {
      return { poll: null, error: pollError };
    }
    
    // Get the results using the database function
    const { data: resultsData, error: resultsError } = await supabase
      .rpc('get_poll_results', { poll_id: pollId });
    
    if (resultsError) {
      return { poll: null, error: resultsError };
    }
    
    const pollWithResults: PollWithResults = {
      ...pollData,
      results: resultsData as PollResult[]
    };
    
    return { poll: pollWithResults, error: null };
  } catch (error) {
    return { poll: null, error };
  }
}

export async function getUserPolls(): Promise<{ polls: Poll[]; error: any }> {
  try {
    // Get the current user using helper
    const { user, error: userError } = await getAuthenticatedUser();
    
    if (userError || !user) {
      return { polls: [], error: userError };
    }
    
    // Get the user's polls
    const { data: pollsData, error: pollsError } = await supabase
      .from('polls')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (pollsError) {
      return { polls: [], error: pollsError };
    }
    
    return { polls: pollsData as Poll[], error: null };
  } catch (error) {
    return { polls: [], error };
  }
}

export async function getPublicPolls(): Promise<{ polls: PollWithOptions[]; error: any }> {
  try {
    // Get all polls with their options (since is_public field was removed)
    const { data: pollsData, error: pollsError } = await supabase
      .from('polls')
      .select(`
        *,
        options:poll_options(*)
      `)
      .order('created_at', { ascending: false });
    
    if (pollsError) {
      return { polls: [], error: pollsError };
    }
    
    return { polls: pollsData as PollWithOptions[], error: null };
  } catch (error) {
    return { polls: [], error };
  }
}

// Vote related functions
export async function submitVote(pollId: string, optionId: string): Promise<boolean> {
  try {
    // Get the current user using helper
    const { user, error: userError } = await getAuthenticatedUser();
    
    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return false;
    }
    
    // Check if user has already voted on this poll
    const { hasVoted, error: checkError } = await hasUserVoted(pollId);
    
    if (checkError) {
      console.error('Error checking vote status:', checkError);
      return false;
    }
    
    if (hasVoted) {
      console.error('User has already voted on this poll');
      return false;
    }
    
    // Insert the vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: user.id
      });
    
    if (voteError) {
      console.error('Error submitting vote:', voteError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in submitVote:', error);
    return false;
  }
}

export async function castVote(
  pollId: string,
  optionId: string,
  anonymousId?: string
): Promise<{ success: boolean; error: any }> {
  try {
    // Get the current user if available
    const { data: { user } } = await supabase.auth.getUser();
    
    // Prepare vote data
    const voteData: Partial<Vote> = {
      poll_id: pollId,
      option_id: optionId,
    };
    
    // Set either user_id or anonymous_user_id
    if (user) {
      voteData.user_id = user.id;
    } else if (anonymousId) {
      voteData.anonymous_user_id = anonymousId;
    } else {
      return { success: false, error: new Error('Either user or anonymous ID is required') };
    }
    
    // Insert the vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert(voteData);
    
    if (voteError) {
      return { success: false, error: voteError };
    }
    
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
}

export async function hasUserVoted(
  pollId: string,
  anonymousId?: string
): Promise<{ hasVoted: boolean; error: any }> {
  try {
    // Get the current user if available
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('votes')
      .select('id')
      .eq('poll_id', pollId);
    
    // Check based on user_id or anonymous_user_id
    if (user) {
      query = query.eq('user_id', user.id);
    } else if (anonymousId) {
      query = query.eq('anonymous_user_id', anonymousId);
    } else {
      return { hasVoted: false, error: new Error('Either user or anonymous ID is required') };
    }
    
    const { data: voteData, error: voteError } = await query;
    
    if (voteError) {
      return { hasVoted: false, error: voteError };
    }
    
    return { hasVoted: voteData && voteData.length > 0, error: null };
  } catch (error) {
    return { hasVoted: false, error };
  }
}

export async function deletePoll(pollId: string): Promise<{ success: boolean; error: any }> {
  console.log(`Attempting to delete poll with ID: ${pollId}`);
  
  try {
    // Get the poll first to check if it exists
    const { data: pollData, error: pollError } = await supabase
      .from('polls')
      .select('id, user_id')
      .eq('id', pollId)
      .single();
      
    if (pollError) {
      console.error('Error fetching poll:', pollError);
      return { success: false, error: pollError };
    }
    
    if (!pollData) {
      console.error('Poll not found');
      return { success: false, error: new Error('Poll not found') };
    }
    
    console.log(`Found poll with ID: ${pollId}, proceeding with deletion`);
    
    // Delete the poll without checking user_id
    // The Row Level Security policies in Supabase will handle authorization
    const { error: deleteError } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId);
    
    if (deleteError) {
      console.error('Supabase error in deletePoll:', deleteError);
      return { success: false, error: deleteError };
    }
    
    console.log(`Successfully deleted poll with ID: ${pollId}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('Exception in deletePoll:', error);
    return { success: false, error };
  }
}