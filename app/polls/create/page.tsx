'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { createPoll } from '@/lib/supabase/database';
import withAuth from '@/hocs/withAuth';
import { useAuth } from '@/contexts/auth';

function CreatePoll() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return; // Minimum 2 options
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to create a poll');
      return;
    }
    
    if (options.some(opt => !opt.trim())) {
      setError('All options must have content');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const pollData = {
        title,
        description,
        options: options.filter(opt => opt.trim()),
      };
      
      const { poll: newPoll, error: createError } = await createPoll(pollData);
      
      if (createError) {
        setError(createError.message || 'Failed to create poll');
        return;
      }
      
      if (newPoll) {
        setSuccess(true);
        setError(null); // Clear any existing errors
        // Show success message for 2 seconds before redirecting
        setTimeout(() => {
          router.push(`/polls/${newPoll.id}`);
        }, 2000);
      } else {
        setError('Failed to create poll');
      }
    } catch (err) {
      console.error('Error creating poll:', err);
      setError('An error occurred while creating the poll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create a New Poll</h1>

        <Card>
          <CardHeader>
            <CardTitle>Poll Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              🎉 Poll created successfully! Redirecting to your poll...
            </div>
          )}
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Poll Question
            </label>
            <Input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your question"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about your poll"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Options
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="flex-1"
                    placeholder={`Option ${index + 1}`}
                    required
                  />
                  <Button
                    type="button"
                    onClick={() => removeOption(index)}
                    variant="destructive"
                    size="sm"
                    disabled={options.length <= 2}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              onClick={addOption}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              + Add Option
            </Button>
          </div>


          
          <div className="flex justify-end space-x-4">
            <Link href="/polls">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Poll'}
            </Button>
          </div>
        </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withAuth(CreatePoll);