'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { PollCard } from '@/app/components/polls/poll-card';
import { getPublicPolls } from '@/lib/supabase/database';
import { PollWithOptions } from '@/types/supabase';
import { useAuth } from '@/contexts/auth';

export default function PollsPage() {
  const [polls, setPolls] = useState<PollWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Function to handle poll deletion
  const handlePollDelete = (pollId: string) => {
    console.log('Removing poll from list:', pollId);
    setPolls(currentPolls => currentPolls.filter(poll => poll.id !== pollId));
  };

  useEffect(() => {
    async function fetchPolls() {
      try {
        setLoading(true);
        const { polls: fetchedPolls, error: fetchError } = await getPublicPolls();
        
        if (fetchError) {
          console.error('Error fetching polls:', fetchError);
          setError('Failed to load polls. Please try again later.');
          return;
        }
        
        setPolls(fetchedPolls);
        setError(null);
      } catch (err) {
        console.error('Error fetching polls:', err);
        setError('Failed to load polls. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchPolls();
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Available Polls</h1>
        <Link href="/polls/create">
          <Button>Create New Poll</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">Loading polls...</p>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500">{error}</p>
        </div>
      ) : polls.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">No polls available. Create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              id={poll.id}
              question={poll.title}
              options={poll.options.map(opt => opt.option_text)}
              votes={poll.options.map(() => 0)}
              createdBy={poll.user_id}
              createdAt={new Date(poll.created_at).toLocaleDateString()}
              showResults={false}
              isOwner={user !== null && user.id === poll.user_id}
              onDelete={handlePollDelete}
            />
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/">
          <Button variant="ghost">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}