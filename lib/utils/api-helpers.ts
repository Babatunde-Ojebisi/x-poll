import { NextResponse } from 'next/server';

// Common error response helper
export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Common success response helper
export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

// Validation helper for required fields
export function validateRequiredFields(body: any, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (!body[field]) {
      return `${field} is required`;
    }
  }
  return null;
}

// Date validation helper
export function validateFutureDate(dateString: string): { isValid: boolean; parsedDate: Date | null } {
  const parsedDate = new Date(dateString);
  const isValid = parsedDate > new Date();
  return { isValid, parsedDate: isValid ? parsedDate : null };
}

// Generic try-catch wrapper for API routes
export async function handleApiRoute<T>(
  handler: () => Promise<T>,
  errorMessage: string = 'An error occurred'
): Promise<NextResponse> {
  try {
    const result = await handler();
    return createSuccessResponse(result);
  } catch (error: any) {
    console.error('API Error:', error);
    return createErrorResponse(error.message || errorMessage, 500);
  }
}