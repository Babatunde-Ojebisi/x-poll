// TypeScript types for Supabase database schema

export type Poll = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  end_date: string | null;
  is_public: boolean;
  allow_multiple_votes: boolean;
  user_id: string;
};

export type PollOption = {
  id: string;
  poll_id: string;
  option_text: string;
  created_at: string;
};

export type Vote = {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string | null;
  anonymous_user_id: string | null;
  created_at: string;
};

export type PollResult = {
  option_id: string;
  option_text: string;
  vote_count: number;
};

export type PollWithOptions = Poll & {
  options: PollOption[];
};

export type PollWithResults = Poll & {
  results: PollResult[];
};

export type PollComplete = Poll & {
  options: PollOption[];
  results: PollResult[];
};

// Database function result types
export type GetPollResultsFunction = {
  option_id: string;
  option_text: string;
  vote_count: number;
};