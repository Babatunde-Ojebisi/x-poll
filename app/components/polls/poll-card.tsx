'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { formatDate, calculatePercentage } from '@/lib/utils';

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
}

export function PollCard({
  id,
  question,
  options,
  votes,
  createdBy,
  createdAt,
  showResults = false,
}: PollCardProps) {
  const totalVotes = votes.reduce((sum, current) => sum + current, 0);

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
      <CardFooter>
        <Link href={`/polls/${id}`} className="w-full">
          <Button variant="outline" className="w-full">
            {showResults ? 'View Details' : 'Vote Now'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}