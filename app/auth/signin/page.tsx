'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
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
          <CardTitle className="text-center text-2xl">Sign in to your account</CardTitle>
        </CardHeader>
        <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
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
                autoComplete="current-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </div>
        </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center w-full">
            <Link href="/auth/signup">
              <Button variant="link" className="w-full">Don't have an account? Sign up</Button>
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