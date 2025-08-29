'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { PollCard } from '@/app/components/polls/poll-card';

// Mock data for polls
const mockPolls = [
  {
    id: '1',
    question: 'What is your favorite programming language?',
    options: ['JavaScript', 'Python', 'Java', 'C#'],
    votes: [42, 35, 20, 15],
    createdBy: 'user1',
    createdAt: '2023-08-15',
  },
  {
    id: '2',
    question: 'Which frontend framework do you prefer?',
    options: ['React', 'Vue', 'Angular', 'Svelte'],
    votes: [50, 30, 15, 25],
    createdBy: 'user2',
    createdAt: '2023-08-10',
  },
  {
    id: '3',
    question: 'What is your preferred database?',
    options: ['MongoDB', 'PostgreSQL', 'MySQL', 'SQLite'],
    votes: [28, 32, 30, 10],
    createdBy: 'user3',
    createdAt: '2023-08-05',
  },
];

export default function PollsPage() {
  const [polls, setPolls] = useState(mockPolls);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Available Polls</h1>
        <Link href="/polls/create">
          <Button>Create New Poll</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {polls.map((poll) => (
          <PollCard
            key={poll.id}
            id={poll.id}
            question={poll.question}
            options={poll.options}
            votes={poll.votes}
            createdBy={poll.createdBy}
            createdAt={poll.createdAt}
            showResults={true}
          />
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/">
          <Button variant="ghost">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}