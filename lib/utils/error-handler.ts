import { NextResponse } from 'next/server';

// Error types for classification
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  INTERNAL = 'INTERNAL',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number,
    userMessage?: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational: boolean = true,
    requestId?: string
  ) {
    super(message);
    
    this.type = type;
    this.severity = severity;
    this.statusCode = statusCode;
    this.userMessage = userMessage || this.getDefaultUserMessage(type);
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.requestId = requestId;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, AppError);
  }

  private getDefaultUserMessage(type: ErrorType): string {
    const messages = {
      [ErrorType.VALIDATION]: 'The provided data is invalid. Please check your input and try again.',
      [ErrorType.AUTHENTICATION]: 'Authentication is required to access this resource.',
      [ErrorType.AUTHORIZATION]: 'You do not have permission to perform this action.',
      [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
      [ErrorType.RATE_LIMIT]: 'Too many requests. Please try again later.',
      [ErrorType.DATABASE]: 'A database error occurred. Please try again later.',
      [ErrorType.NETWORK]: 'A network error occurred. Please check your connection and try again.',
      [ErrorType.INTERNAL]: 'An unexpected error occurred. Please try again later.',
    };
    
    return messages[type] || 'An error occurred. Please try again later.';
  }
}

// Error logging interface (in production, this would integrate with a logging service)
interface ErrorLogEntry {
  timestamp: Date;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  requestId?: string;
  userId?: string;
  endpoint?: string;
  userAgent?: string;
  ip?: string;
}

// Secure error logger
export class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorLogEntry[] = [];

  private constructor() {}

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  public log(error: AppError | Error, context?: {
    requestId?: string;
    userId?: string;
    endpoint?: string;
    userAgent?: string;
    ip?: string;
  }): void {
    const logEntry: ErrorLogEntry = {
      timestamp: new Date(),
      type: error instanceof AppError ? error.type : ErrorType.INTERNAL,
      severity: error instanceof AppError ? error.severity : ErrorSeverity.HIGH,
      message: error.message,
      stack: error.stack,
      ...context,
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', {
        ...logEntry,
        stack: error.stack, // Include stack trace in development
      });
    } else {
      // In production, you would send this to a logging service
      // For now, we'll store it in memory (not recommended for production)
      this.logs.push(logEntry);
      
      // Only log critical errors to console in production
      if (logEntry.severity === ErrorSeverity.CRITICAL) {
        console.error('Critical error:', {
          timestamp: logEntry.timestamp,
          type: logEntry.type,
          message: logEntry.message,
          requestId: logEntry.requestId,
        });
      }
    }
  }

  // Method to get recent logs (for debugging purposes)
  public getRecentLogs(limit: number = 100): ErrorLogEntry[] {
    return this.logs.slice(-limit);
  }
}

// Error response builder
export function createErrorResponse(
  error: AppError | Error,
  requestId?: string
): NextResponse {
  const logger = ErrorLogger.getInstance();
  
  if (error instanceof AppError) {
    // Log the error
    logger.log(error, { requestId });
    
    // Return user-friendly response
    return NextResponse.json(
      {
        error: error.userMessage,
        type: error.type,
        timestamp: error.timestamp.toISOString(),
        requestId: requestId || error.requestId,
      },
      { status: error.statusCode }
    );
  } else {
    // Handle unexpected errors
    const appError = new AppError(
      error.message,
      ErrorType.INTERNAL,
      500,
      'An unexpected error occurred. Please try again later.',
      ErrorSeverity.HIGH,
      false,
      requestId
    );
    
    logger.log(appError, { requestId });
    
    return NextResponse.json(
      {
        error: appError.userMessage,
        type: appError.type,
        timestamp: appError.timestamp.toISOString(),
        requestId: requestId || appError.requestId,
      },
      { status: 500 }
    );
  }
}

// Common error factory functions
export const ErrorFactory = {
  validation: (message: string, userMessage?: string, requestId?: string) =>
    new AppError(message, ErrorType.VALIDATION, 400, userMessage, ErrorSeverity.LOW, true, requestId),
    
  authentication: (message: string = 'Authentication required', requestId?: string) =>
    new AppError(message, ErrorType.AUTHENTICATION, 401, 'Please sign in to continue.', ErrorSeverity.MEDIUM, true, requestId),
    
  authorization: (message: string = 'Insufficient permissions', requestId?: string) =>
    new AppError(message, ErrorType.AUTHORIZATION, 403, 'You do not have permission to perform this action.', ErrorSeverity.MEDIUM, true, requestId),
    
  notFound: (resource: string = 'Resource', requestId?: string) =>
    new AppError(`${resource} not found`, ErrorType.NOT_FOUND, 404, `The requested ${resource.toLowerCase()} was not found.`, ErrorSeverity.LOW, true, requestId),
    
  rateLimit: (message: string = 'Rate limit exceeded', retryAfter?: number, requestId?: string) =>
    new AppError(message, ErrorType.RATE_LIMIT, 429, `Too many requests. ${retryAfter ? `Please try again in ${retryAfter} seconds.` : 'Please try again later.'}`, ErrorSeverity.MEDIUM, true, requestId),
    
  database: (message: string, requestId?: string) =>
    new AppError(message, ErrorType.DATABASE, 500, 'A database error occurred. Please try again later.', ErrorSeverity.HIGH, true, requestId),
    
  network: (message: string, requestId?: string) =>
    new AppError(message, ErrorType.NETWORK, 503, 'A network error occurred. Please check your connection and try again.', ErrorSeverity.MEDIUM, true, requestId),
    
  internal: (message: string, requestId?: string) =>
    new AppError(message, ErrorType.INTERNAL, 500, 'An unexpected error occurred. Please try again later.', ErrorSeverity.HIGH, false, requestId),
};

// Request ID generator
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Error boundary helper for API routes
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const requestId = generateRequestId();
    
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error as Error, requestId);
    }
  };
}