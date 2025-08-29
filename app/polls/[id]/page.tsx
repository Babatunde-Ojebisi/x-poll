'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatDate, calculatePercentage } from '@/lib/utils';

// Mock data for a single poll
const mockPoll = {
  id: '1',
  question: 'What is your favorite programming language?',
  options: ['JavaScript', 'Python', 'Java', 'C#'],
  votes: [42, 35, 20, 15],
  createdBy: 'user1',
  createdAt: '2023-08-15',
};

export default function PollDetail({ params }: { params: { id: string } }) {
  const [poll, setPoll] = useState(mockPoll);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  // In a real app, we would fetch the poll data based on the ID
  useEffect(() => {
    // Simulating API call
    console.log(`Fetching poll with ID: ${params.id}`);
    // In a real app, we would fetch the poll data here
  }, [params.id]);

  const totalVotes = poll.votes.reduce((sum, current) => sum + current, 0);

  const handleVote = () => {
    if (selectedOption === null) return;

    // Update votes (in a real app, this would be an API call)
    const newVotes = [...poll.votes];
    newVotes[selectedOption] += 1;
    setPoll({ ...poll, votes: newVotes });
    setHasVoted(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{poll.question}</h1>

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
                    {option}
                  </label>
                </div>
              ))}
              <Button
                onClick={handleVote}
                disabled={selectedOption === null}
                className="mt-4 w-full"
              >
                Vote
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-4">Results:</h3>
              {poll.options.map((option, index) => {
                const percentage = calculatePercentage(poll.votes[index], totalVotes);
                return (
                  <div key={index} className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span>{option}</span>
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
          <span>Created by {poll.createdBy}</span>
          <span>Created on {formatDate(poll.createdAt)}</span>
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