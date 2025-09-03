'use client';

import { Button } from '@/app/components/ui/button';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeletePollButtonProps {
  pollId: string;
}

export default function DeletePollButton({ pollId }: DeletePollButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        router.push('/polls');
        router.refresh();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete poll: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting poll:', error);
      alert('An error occurred while deleting the poll. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button 
      onClick={handleDelete}
      variant="destructive"
      disabled={isDeleting}
    >
      {isDeleting ? 'Deleting...' : 'Delete Poll'}
    </Button>
  );
}