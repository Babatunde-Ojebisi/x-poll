import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { formatDate } from '@/lib/utils';
import { getPoll } from '@/lib/supabase/database';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PollVotingClient from '@/app/components/polls/poll-voting-client';
import DeletePollButton from '@/app/components/polls/delete-poll-button';

export default async function PollDetail({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch poll data on server
  const result = await getPoll(params.id);
  
  if (!result.poll) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <p className="text-red-500">Poll not found</p>
              <Button asChild className="mt-4">
                <Link href="/polls">Back to Polls</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  const poll = result.poll;
  const isOwner = user && user.id === poll.user_id;

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
        
        {poll.expires_at && (
          <p className="text-sm text-gray-500 mb-4">
            Expires on: {formatDate(poll.expires_at)}
          </p>
        )}

        <PollVotingClient poll={poll} pollId={params.id} />
        
        <div className="flex justify-between items-center text-sm text-gray-500 mb-6">
          <span>Created by {poll.user_id}</span>
          <span>Created on {formatDate(poll.created_at)}</span>
        </div>

        <div className="flex justify-between">
          <div className="flex gap-2">
            <Link href="/polls">
              <Button variant="outline">Back to Polls</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
          </div>
          {isOwner && (
             <DeletePollButton pollId={params.id} />
           )}
        </div>
      </div>
    </div>
  );
}