'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { calculatePercentage } from '@/lib/utils';
import { submitVote } from '@/lib/supabase/database';
import { useAuth } from '@/contexts/auth';
import { PollOption } from '@/types/supabase';

interface PollDetailClientProps {
  pollId: string;
  options: PollOption[];
  votes: number[];
  totalVotes: number;
  hasVoted: boolean;
  allowMultipleVotes: boolean;
}

export function PollDetailClient({ 
  pollId, 
  options, 
  votes: initialVotes, 
  totalVotes: initialTotalVotes, 
  hasVoted: initialHasVoted,
  allowMultipleVotes 
}: PollDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [votes, setVotes] = useState(initialVotes);
  const [totalVotes, setTotalVotes] = useState(initialTotalVotes);
  const [error, setError] = useState<string | null>(null);
  const [voteSubmitting, setVoteSubmitting] = useState(false);

  // Handle vote submission
  const handleVote = async () => {
    if (selectedOption === null) return;
    
    try {
      setVoteSubmitting(true);
      setError(null);
      
      if (!user) {
        // Redirect to login if not authenticated
        router.push('/auth/signin?redirect=' + encodeURIComponent(`/polls/${pollId}`));
        return;
      }
      
      // Submit vote to database
      const optionId = options[selectedOption].id;
      const success = await submitVote(pollId, optionId);
      
      if (success) {
        // Update local state
        const newVotes = [...votes];
        newVotes[selectedOption] += 1;
        
        setVotes(newVotes);
        setTotalVotes(totalVotes + 1);
        setHasVoted(true);
        
        // Store voted poll in localStorage
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
      {!hasVoted ? (
        <div className="space-y-4 p-6">
          {options.map((option, index) => (
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
        <div className="space-y-4 p-6">
          <h3 className="text-lg font-medium mb-4">Results:</h3>
          {options.map((option, index) => {
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
    </Card>
  );
}