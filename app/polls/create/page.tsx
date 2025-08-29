'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import withAuth from '@/hocs/withAuth';

function CreatePoll() {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

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
    // Create poll logic will be implemented here
    console.log('Creating poll:', { question, options });
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
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Poll Question
            </label>
            <Input
              type="text"
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your question"
              required
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
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button type="submit">Create Poll</Button>
          </div>
        </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withAuth(CreatePoll);