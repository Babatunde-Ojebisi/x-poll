-- Create tables for the X-Poll application

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-super-secret-jwt-key';

-- Create a table for polls
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT TRUE,
  allow_multiple_votes BOOLEAN DEFAULT FALSE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Add a constraint to ensure end_date is in the future
  CONSTRAINT end_date_in_future CHECK (end_date > created_at)
);

-- Create a table for poll options
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure either user_id or anonymous_user_id is set, but not both
  CONSTRAINT user_or_anonymous CHECK (
    (user_id IS NOT NULL AND anonymous_user_id IS NULL) OR
    (user_id IS NULL AND anonymous_user_id IS NOT NULL)
  ),
  
  -- Prevent duplicate votes from the same user for the same poll
  -- unless the poll allows multiple votes
  CONSTRAINT unique_user_vote UNIQUE (poll_id, user_id),
  CONSTRAINT unique_anonymous_vote UNIQUE (poll_id, anonymous_user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_polls_user_id ON polls(user_id);
CREATE INDEX idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX idx_votes_poll_id ON votes(poll_id);
CREATE INDEX idx_votes_option_id ON votes(option_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for polls
-- Users can view public polls
CREATE POLICY "Public polls are viewable by everyone" 
  ON polls FOR SELECT 
  USING (is_public = TRUE);

-- Users can view their own polls (even if private)
CREATE POLICY "Users can view their own polls" 
  ON polls FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own polls
CREATE POLICY "Users can insert their own polls" 
  ON polls FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own polls
CREATE POLICY "Users can update their own polls" 
  ON polls FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own polls
CREATE POLICY "Users can delete their own polls" 
  ON polls FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for poll options
-- Anyone can view options for public polls
CREATE POLICY "Anyone can view options for public polls" 
  ON poll_options FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id AND polls.is_public = TRUE
    )
  );

-- Users can view options for their own polls
CREATE POLICY "Users can view options for their own polls" 
  ON poll_options FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid()
    )
  );

-- Users can insert options for their own polls
CREATE POLICY "Users can insert options for their own polls" 
  ON poll_options FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid()
    )
  );

-- Users can update options for their own polls
CREATE POLICY "Users can update options for their own polls" 
  ON poll_options FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid()
    )
  );

-- Users can delete options for their own polls
CREATE POLICY "Users can delete options for their own polls" 
  ON poll_options FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid()
    )
  );

-- Create RLS policies for votes
-- Anyone can view votes for public polls
CREATE POLICY "Anyone can view votes for public polls" 
  ON votes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = votes.poll_id AND polls.is_public = TRUE
    )
  );

-- Users can view votes for their own polls
CREATE POLICY "Users can view votes for their own polls" 
  ON votes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = votes.poll_id AND polls.user_id = auth.uid()
    )
  );

-- Users can insert votes for public polls
CREATE POLICY "Users can insert votes for public polls" 
  ON votes FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = votes.poll_id AND polls.is_public = TRUE
    )
  );

-- Users can update their own votes
CREATE POLICY "Users can update their own votes" 
  ON votes FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes" 
  ON votes FOR DELETE 
  USING (auth.uid() = user_id);

-- Create a function to check if a poll allows multiple votes
CREATE OR REPLACE FUNCTION check_multiple_votes()
  RETURNS TRIGGER AS $$
BEGIN
  -- If the poll doesn't allow multiple votes and the user has already voted
  IF NOT EXISTS (
    SELECT 1 FROM polls 
    WHERE id = NEW.poll_id AND allow_multiple_votes = TRUE
  ) AND EXISTS (
    SELECT 1 FROM votes 
    WHERE poll_id = NEW.poll_id AND 
    ((NEW.user_id IS NOT NULL AND user_id = NEW.user_id) OR 
     (NEW.anonymous_user_id IS NOT NULL AND anonymous_user_id = NEW.anonymous_user_id))
  ) THEN
    RAISE EXCEPTION 'Multiple votes are not allowed for this poll';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to enforce the multiple votes rule
CREATE TRIGGER check_multiple_votes_trigger
  BEFORE INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION check_multiple_votes();

-- Create a view for poll results
CREATE VIEW poll_results AS
SELECT 
  p.id AS poll_id,
  p.title AS poll_title,
  po.id AS option_id,
  po.option_text,
  COUNT(v.id) AS vote_count
FROM polls p
JOIN poll_options po ON p.id = po.poll_id
LEFT JOIN votes v ON po.id = v.option_id
GROUP BY p.id, p.title, po.id, po.option_text
ORDER BY p.id, vote_count DESC;

-- Create a function to get poll results
CREATE OR REPLACE FUNCTION get_poll_results(poll_id UUID)
RETURNS TABLE (
  option_id UUID,
  option_text TEXT,
  vote_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.id,
    po.option_text,
    COUNT(v.id)::BIGINT
  FROM poll_options po
  LEFT JOIN votes v ON po.id = v.option_id
  WHERE po.poll_id = $1
  GROUP BY po.id, po.option_text
  ORDER BY COUNT(v.id) DESC;
END;
$$ LANGUAGE plpgsql;