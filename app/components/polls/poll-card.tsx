'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import DeletePollButton from '@/app/components/polls/delete-poll-button';

// Helper functions for formatting
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function calculatePercentage(votes: number, totalVotes: number): number {
  if (totalVotes === 0) return 0;
  return Math.round((votes / totalVotes) * 100);
}

interface PollOption {
  text: string;
  votes: number;
}

interface PollCardProps {
  id: string;
  question: string;
  options: string[];
  votes: number[];
  createdBy: string;
  createdAt: string;
  showResults?: boolean;
  isOwner?: boolean;
  onDelete?: (id: string) => void; // Callback for when poll is deleted
}

export function PollCard({
  id,
  question,
  options,
  votes,
  createdBy,
  createdAt,
  showResults = false,
  isOwner = false,
  onDelete,
}: PollCardProps) {
  const totalVotes = votes.reduce((sum, current) => sum + current, 0);
  const [isVisible, setIsVisible] = useState(true);
  
  // Handle successful deletion
  const handleDeleteSuccess = () => {
    console.log('Poll deleted successfully, removing from UI');
    setIsVisible(false);
    if (onDelete) {
      onDelete(id);
    }
  };

  if (!isVisible) {
    return null; // Don't render if deleted
  }

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl">{question}</CardTitle>
        <p className="text-sm text-gray-500">
          By {createdBy} • {formatDate(createdAt)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex justify-between">
              <span>{option}</span>
              {showResults && (
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${calculatePercentage(votes[index], totalVotes)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {votes[index]} ({calculatePercentage(votes[index], totalVotes)}%)
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link href={`/polls/${id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            {showResults ? 'View Details' : 'Vote Now'}
          </Button>
        </Link>
        {isOwner && (
          <DeletePollButton pollId={id} onDeleteSuccess={handleDeleteSuccess} />
        )}
      </CardFooter>
    </Card>
  );
}