// TypeScript types for Supabase database schema

export type Poll = {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  is_active: boolean;
};

export type PollOption = {
  id: string;
  poll_id: string;
  option_text: string;
  vote_count: number;
  created_at: string;
};

export interface Vote {
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