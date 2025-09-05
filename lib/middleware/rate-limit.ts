import { NextRequest } from 'next/server';

// In-memory store for rate limiting (in production, use Redis or similar)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Rate limit configurations
const RATE_LIMITS = {
  // General API endpoints
  default: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Poll creation (more restrictive)
  createPoll: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Voting (moderate restriction)
  vote: {
    maxRequests: 50,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Authentication endpoints
  auth: {
    maxRequests: 20,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
};

type RateLimitType = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest, userId?: string): string {
  // Prefer user ID if authenticated, otherwise use IP
  if (userId) {
    return `user:${userId}`;
  }
  
  // Get IP address from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of Array.from(requestCounts.entries())) {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  }
}

/**
 * Check and update rate limit for a client
 */
export function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = 'default',
  userId?: string
): RateLimitResult {
  const clientId = getClientId(request, userId);
  const key = `${type}:${clientId}`;
  const config = RATE_LIMITS[type];
  const now = Date.now();
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    cleanupExpiredEntries();
  }
  
  const existing = requestCounts.get(key);
  
  if (!existing || now > existing.resetTime) {
    // First request or window has reset
    const resetTime = now + config.windowMs;
    requestCounts.set(key, { count: 1, resetTime });
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }
  
  if (existing.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfter: Math.ceil((existing.resetTime - now) / 1000),
    };
  }
  
  // Increment count
  existing.count++;
  requestCounts.set(key, existing);
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime,
  };
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return headers;
}

/**
 * Rate limiting middleware function
 */
export function withRateLimit(
  handler: (request: NextRequest, ...args: any[]) => Promise<Response>,
  type: RateLimitType = 'default'
) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => {
    try {
      // Extract user ID if available (you may need to adjust this based on your auth implementation)
      let userId: string | undefined;
      
      // Try to get user from session (this is a simplified approach)
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        // In a real implementation, you'd decode the JWT or session token
        // For now, we'll skip user-based rate limiting in middleware
      }
      
      const rateLimitResult = checkRateLimit(request, type, userId);
      
      if (!rateLimitResult.success) {
        const headers = createRateLimitHeaders(rateLimitResult);
        return new Response(
          JSON.stringify({
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
          }
        );
      }
      
      // Call the original handler
      const response = await handler(request, ...args);
      
      // Add rate limit headers to successful responses
      const headers = createRateLimitHeaders(rateLimitResult);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    } catch (error) {
      // If rate limiting fails, allow the request to proceed
      return handler(request, ...args);
    }
  };
}