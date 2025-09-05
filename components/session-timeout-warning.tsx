"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { Clock, AlertTriangle } from 'lucide-react';

interface SessionTimeoutWarningProps {
  warningThreshold?: number; // Show warning when this many milliseconds are left (default: 5 minutes)
}

export function SessionTimeoutWarning({ 
  warningThreshold = 5 * 60 * 1000 // 5 minutes
}: SessionTimeoutWarningProps) {
  const { user, sessionTimeLeft, extendSession } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [autoLogoutTimer, setAutoLogoutTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !sessionTimeLeft) {
      setShowWarning(false);
      if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer);
        setAutoLogoutTimer(null);
      }
      return;
    }

    // Show warning if session time is below threshold
    if (sessionTimeLeft <= warningThreshold && sessionTimeLeft > 0) {
      if (!showWarning) {
        setShowWarning(true);
        setTimeLeft(sessionTimeLeft);
        
        // Set auto-logout timer
        const timer = setTimeout(() => {
          handleAutoLogout();
        }, sessionTimeLeft);
        setAutoLogoutTimer(timer);
      }
    } else {
      setShowWarning(false);
      if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer);
        setAutoLogoutTimer(null);
      }
    }

    return () => {
      if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer);
      }
    };
  }, [user, sessionTimeLeft, warningThreshold, showWarning, autoLogoutTimer]);

  // Update countdown timer
  useEffect(() => {
    if (!showWarning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1000);
        if (newTime === 0) {
          handleAutoLogout();
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning, timeLeft]);

  const handleExtendSession = () => {
    extendSession();
    setShowWarning(false);
    setTimeLeft(0);
    
    if (autoLogoutTimer) {
      clearTimeout(autoLogoutTimer);
      setAutoLogoutTimer(null);
    }
  };

  const handleAutoLogout = () => {
    setShowWarning(false);
    
    // Force logout by clearing session
    localStorage.removeItem('lastActivity');
    
    // Redirect to login page
    window.location.href = '/auth/login?reason=session_expired';
  };

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressValue = (): number => {
    if (!sessionTimeLeft) return 0;
    return (timeLeft / warningThreshold) * 100;
  };

  const getWarningLevel = (): 'warning' | 'critical' => {
    const minutes = Math.floor(timeLeft / 60000);
    return minutes <= 1 ? 'critical' : 'warning';
  };

  if (!showWarning || !user) {
    return null;
  }

  const warningLevel = getWarningLevel();
  const progressValue = getProgressValue();

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {warningLevel === 'critical' ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
            Session Timeout Warning
          </DialogTitle>
          <DialogDescription>
            Your session will expire soon due to inactivity. Please extend your session to continue.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className={`text-2xl font-mono font-bold ${
              warningLevel === 'critical' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {formatTime(timeLeft)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Time remaining
            </p>
          </div>
          
          <Progress 
            value={progressValue} 
            className={`h-2 ${
              warningLevel === 'critical' ? '[&>div]:bg-red-500' : '[&>div]:bg-yellow-500'
            }`}
          />
          
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Why am I seeing this?</strong><br />
              For your security, we automatically log you out after 2 hours of inactivity.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleAutoLogout}
            className="w-full sm:w-auto"
          >
            Log Out Now
          </Button>
          <Button
            onClick={handleExtendSession}
            className={`w-full sm:w-auto ${
              warningLevel === 'critical' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-yellow-600 hover:bg-yellow-700'
            }`}
          >
            Extend Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for components that need session status
export function useSessionStatus() {
  const { user, sessionTimeLeft } = useAuth();
  
  const getSessionStatus = () => {
    if (!user || !sessionTimeLeft) {
      return { status: 'inactive', timeLeft: 0, percentage: 0 };
    }
    
    const totalTime = 2 * 60 * 60 * 1000; // 2 hours
    const percentage = (sessionTimeLeft / totalTime) * 100;
    
    let status: 'active' | 'warning' | 'critical' = 'active';
    
    if (sessionTimeLeft <= 60000) { // 1 minute
      status = 'critical';
    } else if (sessionTimeLeft <= 5 * 60 * 1000) { // 5 minutes
      status = 'warning';
    }
    
    return {
      status,
      timeLeft: sessionTimeLeft,
      percentage: Math.max(0, Math.min(100, percentage)),
    };
  };
  
  return getSessionStatus();
}