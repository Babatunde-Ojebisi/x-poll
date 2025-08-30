-- Add Missing Database Function for Existing X-Poll Database
-- Run this script in your Supabase SQL Editor to add the missing get_poll_results function
-- This is safe to run on an existing database

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
SELECT 'Missing function added successfully! Poll viewing should now work.' AS message;