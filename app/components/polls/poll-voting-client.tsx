'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { calculatePercentage } from '@/lib/utils';
import { submitVote } from '@/lib/supabase/database';
import { useAuth } from '@/contexts/auth';
import { PollWithOptions } from '@/types/supabase';

interface PollVotingClientProps {
  poll: PollWithOptions;
  pollId: string;
}

export default function PollVotingClient({ poll, pollId }: PollVotingClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votes, setVotes] = useState<number[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [voteSubmitting, setVoteSubmitting] = useState(false);

  useEffect(() => {
    // Initialize vote counts from poll data
    if (poll && poll.options && Array.isArray(poll.options)) {
      const voteCounts = poll.options.map((option: any) => option.vote_count || 0);
      setVotes(voteCounts);
      setTotalVotes(voteCounts.reduce((sum: number, count: number) => sum + count, 0));
    } else {
      setVotes([]);
      setTotalVotes(0);
    }

    // Check if user has already voted
    const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '{}');
    setHasVoted(!!votedPolls[pollId]);
  }, [poll, pollId]);

  // Early return if poll or options are not available
  if (!poll || !poll.options || !Array.isArray(poll.options) || poll.options.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <p className="text-gray-500">Loading poll options...</p>
        </CardContent>
      </Card>
    );
  }

  const handleVote = async () => {
    if (selectedOption === null) return;
    
    try {
      setVoteSubmitting(true);
      setError(null);
      
      if (!user) {
        router.push('/auth/signin?redirect=' + encodeURIComponent(`/polls/${pollId}`));
        return;
      }
      
      // Ensure poll and options exist before accessing
      if (!poll || !poll.options || !Array.isArray(poll.options) || !poll.options[selectedOption]) {
        setError('Invalid poll option');
        return false;
      }
      const optionId = poll.options[selectedOption].id;
      const success = await submitVote(pollId, optionId);
      
      if (success) {
        const newVotes = [...votes];
        newVotes[selectedOption] += 1;
        
        setVotes(newVotes);
        setTotalVotes(totalVotes + 1);
        setHasVoted(true);
        
        const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '{}');
        votedPolls[pollId] = true;
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

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        {!hasVoted ? (
          <div className="space-y-4">
            {poll && poll.options && Array.isArray(poll.options) && poll.options.map((option: any, index: number) => (
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
            {poll && poll.options && Array.isArray(poll.options) && poll.options.map((option: any, index: number) => {
              const percentage = calculatePercentage(votes[index], totalVotes);
              return (
                <div key={index} className="mb-2">
                  <div className="flex justify-between mb-1">
                    <span>{option.option_text}</span>
                    <span>{votes[index]} votes ({percentage}%)</span>
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
      </CardContent>
    </Card>
  );
}