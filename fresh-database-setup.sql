-- Fresh Database Setup for X-Poll Application
-- Run this script in your NEW Supabase project's SQL Editor
-- This will create all tables and proper RLS policies from scratch

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Create poll_options table
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, user_id) -- One vote per user per poll
);

-- Enable Row Level Security on all tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for polls table
-- Only authenticated users can create polls
CREATE POLICY "Authenticated users can create polls" 
  ON polls FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Everyone can view active polls
CREATE POLICY "Anyone can view active polls" 
  ON polls FOR SELECT 
  USING (is_active = true);

-- Users can update their own polls
CREATE POLICY "Users can update their own polls" 
  ON polls FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own polls
CREATE POLICY "Users can delete their own polls" 
  ON polls FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for poll_options table
-- Authenticated users can create options for any poll
CREATE POLICY "Authenticated users can create poll options" 
  ON poll_options FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM polls 
    WHERE polls.id = poll_options.poll_id 
    AND polls.is_active = true
  ));

-- Everyone can view poll options
CREATE POLICY "Anyone can view poll options" 
  ON poll_options FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM polls 
    WHERE polls.id = poll_options.poll_id 
    AND polls.is_active = true
  ));

-- RLS Policies for votes table
-- Authenticated users can vote
CREATE POLICY "Authenticated users can vote" 
  ON votes FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = votes.poll_id 
      AND polls.is_active = true
    )
  );

-- Users can view all votes (for results)
CREATE POLICY "Anyone can view votes" 
  ON votes FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM polls 
    WHERE polls.id = votes.poll_id 
    AND polls.is_active = true
  ));

-- Users can update their own votes
CREATE POLICY "Users can update their own votes" 
  ON votes FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON polls TO authenticated;
GRANT ALL ON poll_options TO authenticated;
GRANT ALL ON votes TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_user_id ON polls(user_id);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);

-- Create a function to update vote counts
CREATE OR REPLACE FUNCTION update_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE poll_options 
    SET vote_count = vote_count + 1 
    WHERE id = NEW.option_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE poll_options 
    SET vote_count = vote_count - 1 
    WHERE id = OLD.option_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update vote counts
CREATE TRIGGER vote_count_trigger
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_vote_count();

-- Create function to get poll results
CREATE OR REPLACE FUNCTION get_poll_results(poll_id UUID)
RETURNS TABLE (
  option_id UUID,
  option_text TEXT,
  vote_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.id as option_id,
    po.option_text,
    po.vote_count
  FROM poll_options po
  WHERE po.poll_id = $1
  ORDER BY po.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Database setup completed successfully! You can now create polls.' AS message;