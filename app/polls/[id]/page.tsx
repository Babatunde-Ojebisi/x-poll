'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatDate, calculatePercentage } from '@/lib/utils';
import { getPollWithResults, submitVote } from '@/lib/supabase/database';
import { useAuth } from '@/contexts/auth';
import { PollOption, PollWithOptions, PollWithResults } from '@/types/supabase';

// Interface for poll with vote counts
interface PollWithVotes extends PollWithResults {
  votes: number[];
  totalVotes: number;
  options: PollOption[];
}

export default function PollDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [poll, setPoll] = useState<PollWithVotes | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteSubmitting, setVoteSubmitting] = useState(false);

  // Fetch poll data
  useEffect(() => {
    async function fetchPoll() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await getPollWithResults(params.id);
        
        if (result.poll) {
          // Transform poll data to include vote counts
          const pollWithVotes: PollWithVotes = {
            ...result.poll,
            votes: result.poll.results.map(result => result.vote_count),
            totalVotes: result.poll.results.reduce((sum, result) => sum + result.vote_count, 0),
            options: result.poll.results.map(result => ({
              id: result.option_id,
              poll_id: params.id,
              option_text: result.option_text,
              created_at: ''
            }))
          };
          
          setPoll(pollWithVotes);
          
          // Check if user has already voted on this poll
          // This would typically be done via a database query
          // For now, we'll use localStorage as a simple way to track votes
          const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '{}');
          if (votedPolls[params.id]) {
            setHasVoted(true);
          }
        } else {
          setError('Poll not found');
        }
      } catch (err) {
        console.error('Error fetching poll:', err);
        setError('Failed to load poll');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPoll();
  }, [params.id]);

  // Handle vote submission
  const handleVote = async () => {
    if (selectedOption === null || !poll) return;
    
    try {
      setVoteSubmitting(true);
      
      if (!user) {
        // Redirect to login if not authenticated
        router.push('/login?redirect=' + encodeURIComponent(`/polls/${params.id}`));
        return;
      }
      
      // Submit vote to database
      const optionId = poll.options[selectedOption].id;
      const success = await submitVote(params.id, optionId);
      
      if (success) {
        // Update local state
        const newVotes = [...poll.votes];
        newVotes[selectedOption] += 1;
        
        setPoll({
          ...poll,
          votes: newVotes,
          totalVotes: poll.totalVotes + 1
        });
        
        setHasVoted(true);
        
        // Store voted poll in localStorage
        const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '{}');
        votedPolls[params.id] = true;
        localStorage.setItem('votedPolls', JSON.stringify(votedPolls));
      } else {
        setError('Failed to submit vote');
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
      setError('An error occurred while submitting your vote');
    } finally {
      setVoteSubmitting(false);
    }
  };

  // If loading or error
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <p>Loading poll...</p>
        </div>
      </div>
    );
  }
  
  if (error || !poll) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <p className="text-red-500">{error || 'Poll not found'}</p>
              <Button asChild className="mt-4">
                <Link href="/polls">Back to Polls</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{poll.title}</h1>
          <Button variant="outline" asChild>
            <Link href="/polls">Back to Polls</Link>
          </Button>
        </div>
        
        {poll.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-6">{poll.description}</p>
        )}
        
        {poll.end_date && (
          <p className="text-sm text-gray-500 mb-4">
            Ends on: {formatDate(poll.end_date)}
          </p>
        )}

        <Card className="mb-6">
          {!hasVoted ? (
            <div className="space-y-4">
              {poll.options.map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="radio"
                    id={`option-${index}`}
                    name="poll-option"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    onChange={() => setSelectedOption(index)}
                    checked={selectedOption === index}
                  />
                  <label
                    htmlFor={`option-${index}`}
                    className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {option.option_text}
                  </label>
                </div>
              ))}
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
              <Button
                onClick={handleVote}
                disabled={selectedOption === null || voteSubmitting}
                className="mt-4 w-full"
              >
                {voteSubmitting ? 'Submitting...' : 'Vote'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-4">Results:</h3>
              {poll.options.map((option, index) => {
                const percentage = calculatePercentage(poll.votes[index], poll.totalVotes);
                return (
                  <div key={index} className="mb-2">
                  <div className="flex justify-between mb-1">
                    <span>{option.option_text}</span>
                    <span>{poll.votes[index]} votes ({percentage}%)</span>
                  </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="flex justify-between items-center text-sm text-gray-500 mb-6">
          <span>Created by {poll.user_id}</span>
          <span>Created on {formatDate(poll.created_at)}</span>
        </div>

        <div className="flex justify-between">
          <Link href="/polls">
            <Button variant="outline">Back to Polls</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}