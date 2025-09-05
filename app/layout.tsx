import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/app/components/ui/navbar';
import { AuthProvider } from '@/contexts/auth';
import { Toaster } from '@/app/components/ui/toaster';
import { SessionTimeoutWarning } from '@/components/session-timeout-warning';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'X-Poll App',
  description: 'Create and share polls with your friends',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
          <SessionTimeoutWarning />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}