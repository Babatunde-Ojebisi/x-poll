'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });
    if (error) {
      alert(error.message);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Create your account</CardTitle>
        </CardHeader>
        <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="email-address" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm Password
              </label>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full">
              Sign up
            </Button>
          </div>
        </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center w-full">
            <Link href="/auth/signin">
              <Button variant="link" className="w-full">Already have an account? Sign in</Button>
            </Link>
          </div>
          <div className="text-center w-full">
            <Link href="/">
              <Button variant="ghost" className="w-full">Back to home</Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}