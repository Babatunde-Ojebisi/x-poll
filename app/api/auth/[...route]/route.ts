import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// In-memory store for rate limiting
// In production, use Redis or another distributed store
const rateLimit = new Map();

// Rate limit configuration
const RATE_LIMIT_MAX = 5; // Maximum requests
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limit
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  
  // Initialize or clean up existing record
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, []);
  } else {
    // Remove timestamps outside current window
    const timestamps = rateLimit.get(ip);
    const validTimestamps = timestamps.filter((timestamp: number) => timestamp > windowStart);
    rateLimit.set(ip, validTimestamps);
  }
  
  // Check if rate limit exceeded
  const timestamps = rateLimit.get(ip);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: 'Too many requests, please try again later' },
      { status: 429 }
    );
  }
  
  // Add current request timestamp
  timestamps.push(now);
  rateLimit.set(ip, timestamps);
  
  // Process the authentication request
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Parse request body
    const body = await request.json();
    
    // Handle different auth operations based on request path
    const path = request.nextUrl.pathname;
    
    if (path.endsWith('/signin')) {
      const { email, password } = body;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      return NextResponse.json({ data });
    }
    
    if (path.endsWith('/signup')) {
      const { email, password } = body;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      return NextResponse.json({ data });
    }
    
    // Default response for unhandled paths
    return NextResponse.json({ error: 'Invalid auth endpoint' }, { status: 400 });
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}