import Link from 'next/link';
import { Button } from './components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './components/ui/card';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="max-w-5xl w-full flex flex-col gap-8 items-center">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4">X-Poll App</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">Create and share polls with your friends</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Create Polls</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Create custom polls with multiple options and share them with your friends or colleagues.</p>
            </CardContent>
            <CardFooter>
              <Link href="/polls/create" className="w-full">
                <Button className="w-full">Create a Poll</Button>
              </Link>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Vote on Polls</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Browse existing polls and cast your vote. See real-time results and statistics.</p>
            </CardContent>
            <CardFooter>
              <Link href="/polls" className="w-full">
                <Button variant="outline" className="w-full">View Polls</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
        
        <div className="mt-8">
          <p className="text-center mb-4">Don't have an account yet?</p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signin">
              <Button variant="secondary">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="outline">Sign Up</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}