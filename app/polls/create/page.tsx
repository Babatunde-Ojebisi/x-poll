'use client';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { createPoll } from '@/lib/supabase/database';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import withAuth from '@/hocs/withAuth';
import { useAuth } from '@/contexts/auth';

// Remove this function as we're moving its contents to CreatePollPage

function CreatePollPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return; // Minimum 2 options required
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    const validOptions = options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      setError('At least two options are required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const { poll: newPoll, error: createError } = await createPoll({
        title,
        description,
        options: validOptions,
      });
      
      if (createError) {
        throw new Error(createError.message || 'Failed to create poll');
      }
      
      if (newPoll) {
        router.push(`/polls/${newPoll.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
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
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{error}</span>
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
                        placeholder={`Option ${index + 1}${index < 2 ? ' (required)' : ' (optional)'}`}
                        required={index < 2}
                      />
                      {index >= 2 && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          onClick={() => removeOption(index)}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {options.length < 6 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full mt-2" 
                      onClick={addOption}
                    >
                      Add Option
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <Link href="/polls">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Poll'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Export the component wrapped with withAuth HOC
const CreatePoll = withAuth(CreatePollPage);
export default CreatePoll;