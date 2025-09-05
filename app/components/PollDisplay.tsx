'use client';

import { useState, useEffect } from 'react';
import { Poll, PollOption, PollResult } from '@/types/supabase';
import { useCSRF } from '@/hooks/useCSRF';

type PollDisplayProps = {
  pollId: string;
};

export default function PollDisplay({ pollId }: PollDisplayProps) {
  const { votePoll, deletePoll, isLoading: csrfLoading } = useCSRF();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [results, setResults] = useState<PollResult[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch poll data
  useEffect(() => {
    const fetchPoll = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Check if user has voted
        const voteResponse = await fetch(`/api/polls/${pollId}/vote`);
        const voteData = await voteResponse.json();
        
        if (voteResponse.ok) {
          setHasVoted(voteData.hasVoted);
        }
        
        // Get poll with results if user has voted, otherwise just get the poll
        const includeResults = voteData.hasVoted ? 'true' : 'false';
        const pollResponse = await fetch(`/api/polls/${pollId}?results=${includeResults}`);
        const pollData = await pollResponse.json();
        
        if (!pollResponse.ok) {
          throw new Error(pollData.error || 'Failed to fetch poll');
        }
        
        setPoll(pollData.poll);
        
        if (pollData.poll.options) {
          setOptions(pollData.poll.options);
        }
        
        if (pollData.poll.results) {
          setResults(pollData.poll.results);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPoll();
  }, [pollId]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOption) {
      setError('Please select an option');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      const response = await votePoll(pollId, selectedOption);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cast vote');
      }
      
      // Refresh the poll to show results
      setHasVoted(true);
      
      // Fetch updated results
      const pollResponse = await fetch(`/api/polls/${pollId}?results=true`);
      const pollData = await pollResponse.json();
      
      if (pollResponse.ok && pollData.poll.results) {
        setResults(pollData.poll.results);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center p-6">Loading poll...</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-100 text-red-700 rounded-md">
        Error: {error}
      </div>
    );
  }

  if (!poll) {
    return <div className="text-center p-6">Poll not found</div>;
  }

  // Check if poll has ended
  const hasEnded = poll.expires_at && new Date(poll.expires_at) < new Date();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-2">{poll.title}</h1>
      
      {poll.description && (
        <p className="text-gray-600 mb-4">{poll.description}</p>
      )}
      
      <div className="text-sm text-gray-500 mb-6">
        Created: {new Date(poll.created_at).toLocaleDateString()}
        {poll.expires_at && (
          <> · Ends: {new Date(poll.expires_at).toLocaleDateString()}</>
        )}
        {hasEnded && (
          <span className="ml-2 text-red-500 font-medium">Poll has ended</span>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {hasVoted || hasEnded ? (
        // Show results
        <div className="space-y-4">
          <h2 className="text-lg font-medium mb-2">Results</h2>
          
          {results.map((result) => {
            const option = options.find(o => o.id === result.option_id);
            const totalVotes = results.reduce((sum, r) => sum + r.vote_count, 0);
            const percentage = totalVotes > 0 ? (result.vote_count / totalVotes) * 100 : 0;
            
            return (
              <div key={result.option_id} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span>{option?.option_text}</span>
                  <span className="text-gray-600">
                    {result.vote_count} vote{result.vote_count !== 1 ? 's' : ''} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
          
          <div className="mt-4 text-gray-600 text-sm">
            Total votes: {results.reduce((sum, r) => sum + r.vote_count, 0)}
          </div>
        </div>
      ) : (
        // Show voting form
        <form onSubmit={handleVote}>
          <h2 className="text-lg font-medium mb-2">Cast your vote</h2>
          
          <div className="space-y-2 mb-4">
            {options.map((option) => (
              <div key={option.id} className="flex items-center">
                <input
                  type="radio"
                  id={option.id}
                  name="pollOption"
                  value={option.id}
                  checked={selectedOption === option.id}
                  onChange={() => setSelectedOption(option.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor={option.id} className="ml-2 block text-gray-700">
                  {option.option_text}
                </label>
              </div>
            ))}
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting || csrfLoading || !selectedOption}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Vote'}
          </button>
          

        </form>
      )}
    </div>
  );
}