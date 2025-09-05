import { supabase, createClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

// Session configuration
export const SESSION_CONFIG = {
  // Session timeout in milliseconds (30 minutes)
  TIMEOUT_DURATION: 30 * 60 * 1000,
  // Warning time before session expires (5 minutes)
  WARNING_DURATION: 5 * 60 * 1000,
  // Refresh token before expiry (10 minutes)
  REFRESH_THRESHOLD: 10 * 60 * 1000,
  // Maximum session duration (8 hours)
  MAX_SESSION_DURATION: 8 * 60 * 60 * 1000,
  // Inactivity timeout (2 hours)
  INACTIVITY_TIMEOUT: 2 * 60 * 60 * 1000,
};

// Session activity tracking
interface SessionActivity {
  userId: string;
  lastActivity: number;
  sessionStart: number;
  warningShown: boolean;
}

// In-memory store for session activities (in production, use Redis or database)
const sessionActivities = new Map<string, SessionActivity>();

/**
 * Track user activity for session management
 */
export function trackUserActivity(userId: string): void {
  const now = Date.now();
  const existing = sessionActivities.get(userId);
  
  sessionActivities.set(userId, {
    userId,
    lastActivity: now,
    sessionStart: existing?.sessionStart || now,
    warningShown: false,
  });
}

/**
 * Check if session should be terminated due to inactivity or max duration
 */
export function shouldTerminateSession(userId: string): {
  shouldTerminate: boolean;
  reason?: 'inactivity' | 'max_duration' | 'not_found';
} {
  const activity = sessionActivities.get(userId);
  
  if (!activity) {
    return { shouldTerminate: true, reason: 'not_found' };
  }
  
  const now = Date.now();
  const timeSinceActivity = now - activity.lastActivity;
  const totalSessionTime = now - activity.sessionStart;
  
  if (timeSinceActivity > SESSION_CONFIG.INACTIVITY_TIMEOUT) {
    return { shouldTerminate: true, reason: 'inactivity' };
  }
  
  if (totalSessionTime > SESSION_CONFIG.MAX_SESSION_DURATION) {
    return { shouldTerminate: true, reason: 'max_duration' };
  }
  
  return { shouldTerminate: false };
}

/**
 * Check if session warning should be shown
 */
export function shouldShowSessionWarning(userId: string): boolean {
  const activity = sessionActivities.get(userId);
  
  if (!activity || activity.warningShown) {
    return false;
  }
  
  const now = Date.now();
  const timeSinceActivity = now - activity.lastActivity;
  const timeUntilTimeout = SESSION_CONFIG.INACTIVITY_TIMEOUT - timeSinceActivity;
  
  if (timeUntilTimeout <= SESSION_CONFIG.WARNING_DURATION) {
    // Mark warning as shown
    activity.warningShown = true;
    sessionActivities.set(userId, activity);
    return true;
  }
  
  return false;
}

/**
 * Clean up expired session activities
 */
export function cleanupExpiredSessions(): void {
  const now = Date.now();
  
  for (const [userId, activity] of Array.from(sessionActivities.entries())) {
    const timeSinceActivity = now - activity.lastActivity;
    
    if (timeSinceActivity > SESSION_CONFIG.INACTIVITY_TIMEOUT) {
      sessionActivities.delete(userId);
    }
  }
}

/**
 * Validate and refresh session if needed (server-side)
 */
export async function validateAndRefreshSession(request: NextRequest): Promise<{
  isValid: boolean;
  session: any;
  shouldRefresh: boolean;
  error?: string;
}> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return {
        isValid: false,
        session: null,
        shouldRefresh: false,
        error: error?.message || 'No session found',
      };
    }
    
    const userId = session.user.id;
    
    // Check if session should be terminated
    const terminationCheck = shouldTerminateSession(userId);
    if (terminationCheck.shouldTerminate) {
      // Clean up session
      sessionActivities.delete(userId);
      await supabase.auth.signOut();
      
      return {
        isValid: false,
        session: null,
        shouldRefresh: false,
        error: `Session terminated due to ${terminationCheck.reason}`,
      };
    }
    
    // Track activity
    trackUserActivity(userId);
    
    // Check if token needs refresh
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    const shouldRefresh = timeUntilExpiry < SESSION_CONFIG.REFRESH_THRESHOLD;
    
    return {
      isValid: true,
      session,
      shouldRefresh,
    };
  } catch (error: any) {
    return {
      isValid: false,
      session: null,
      shouldRefresh: false,
      error: error.message,
    };
  }
}

/**
 * Client-side session management utilities
 */
export const ClientSessionManager = {
  /**
   * Initialize session monitoring on the client
   */
  init(): void {
    if (typeof window === 'undefined') return;
    
    // Set up periodic session validation
    setInterval(() => {
      this.checkSession();
    }, 60000); // Check every minute
    
    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const trackActivity = () => {
      // Send activity ping to server or update local timestamp
      localStorage.setItem('lastActivity', Date.now().toString());
    };
    
    activityEvents.forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });
    
    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkSession();
      }
    });
  },
  
  /**
   * Check current session status
   */
  async checkSession(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        this.handleSessionExpired('No active session');
        return;
      }
      
      const userId = session.user.id;
      const lastActivity = localStorage.getItem('lastActivity');
      const now = Date.now();
      
      if (lastActivity) {
        const timeSinceActivity = now - parseInt(lastActivity);
        
        if (timeSinceActivity > SESSION_CONFIG.INACTIVITY_TIMEOUT) {
          this.handleSessionExpired('Session expired due to inactivity');
          return;
        }
        
        // Show warning if needed
        const timeUntilTimeout = SESSION_CONFIG.INACTIVITY_TIMEOUT - timeSinceActivity;
        if (timeUntilTimeout <= SESSION_CONFIG.WARNING_DURATION) {
          this.showSessionWarning(Math.ceil(timeUntilTimeout / 60000));
        }
      }
      
      // Check token expiry
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry < SESSION_CONFIG.REFRESH_THRESHOLD) {
        await this.refreshSession();
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  },
  
  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        this.handleSessionExpired('Failed to refresh session');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      this.handleSessionExpired('Session refresh failed');
      return false;
    }
  },
  
  /**
   * Handle session expiration
   */
  handleSessionExpired(reason: string): void {
    console.log('Session expired:', reason);
    
    // Clear local storage
    localStorage.removeItem('lastActivity');
    
    // Sign out
    supabase.auth.signOut();
    
    // Redirect to login or show modal
    if (typeof window !== 'undefined') {
      // Show user-friendly message
      alert('Your session has expired. Please log in again.');
      
      // Redirect to login page
      window.location.href = '/auth/login';
    }
  },
  
  /**
   * Show session warning to user
   */
  showSessionWarning(minutesLeft: number): void {
    // This could be replaced with a proper modal/toast component
    const shouldExtend = confirm(
      `Your session will expire in ${minutesLeft} minute(s). Do you want to extend it?`
    );
    
    if (shouldExtend) {
      // Update activity timestamp
      localStorage.setItem('lastActivity', Date.now().toString());
      this.refreshSession();
    }
  },
  
  /**
   * Manually extend session
   */
  extendSession(): void {
    localStorage.setItem('lastActivity', Date.now().toString());
    this.refreshSession();
  },
};

/**
 * Higher-order function to wrap API handlers with session validation
 */
export function withSessionValidation<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const sessionValidation = await validateAndRefreshSession(request);
    
    if (!sessionValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Session invalid',
          message: sessionValidation.error,
          code: 'SESSION_INVALID',
        },
        { status: 401 }
      );
    }
    
    // Add session info to request headers for the handler
    const requestWithSession = new NextRequest(request, {
      headers: {
        ...request.headers,
        'x-user-id': sessionValidation.session.user.id,
        'x-session-valid': 'true',
      },
    });
    
    const response = await handler(requestWithSession, ...args);
    
    // Add session status headers to response
    response.headers.set('X-Session-Valid', 'true');
    if (sessionValidation.shouldRefresh) {
      response.headers.set('X-Should-Refresh-Session', 'true');
    }
    
    return response;
  };
}

// Cleanup interval (run every 5 minutes)
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
}