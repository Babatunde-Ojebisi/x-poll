'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Trash2 } from 'lucide-react';

interface DeletePollButtonProps {
  pollId: string;
  onDeleteSuccess?: () => void; // Callback for successful deletion
}

export default function DeletePollButton({ pollId, onDeleteSuccess }: DeletePollButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      // Get auth cookies from browser and include them in the request
      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'DELETE',
        credentials: 'include', // Important: include cookies
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Prevent caching of the delete request
      });

      const responseText = await response.text();
      
      let errorData;
      try {
        errorData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        errorData = { message: responseText || 'Unknown error' };
      }

      if (response.ok) {
        
        // Call the onDeleteSuccess callback if provided
        if (onDeleteSuccess) {
          onDeleteSuccess();
        } else {
          // Fall back to page navigation if no callback provided
          window.location.href = '/polls';
        }
      } else {
        console.error('Failed to delete poll:', errorData);
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