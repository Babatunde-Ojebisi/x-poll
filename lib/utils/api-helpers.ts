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
    if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
      return `${field} is required`;
    }
  }
  return null;
}

// Input sanitization functions
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  // Remove HTML tags and trim whitespace
  const sanitized = input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"'&]/g, (match) => { // Escape dangerous characters
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match] || match;
    })
    .trim();
    
  // Enforce maximum length
  return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
}

export function sanitizeArray(input: any[], maxItems: number = 10, itemMaxLength: number = 500): string[] {
  if (!Array.isArray(input)) {
    throw new Error('Input must be an array');
  }
  
  if (input.length > maxItems) {
    throw new Error(`Maximum ${maxItems} items allowed`);
  }
  
  return input.map(item => {
    if (typeof item !== 'string') {
      throw new Error('All array items must be strings');
    }
    return sanitizeString(item, itemMaxLength);
  }).filter(item => item.length > 0); // Remove empty strings
}

export function validatePollInput(body: any): { isValid: boolean; error?: string; sanitizedData?: any } {
  try {
    const { title, description, expires_at, options } = body;
    
    // Validate required fields
    const requiredFieldError = validateRequiredFields(body, ['title', 'options']);
    if (requiredFieldError) {
      return { isValid: false, error: requiredFieldError };
    }
    
    // Sanitize and validate title
    const sanitizedTitle = sanitizeString(title, 200);
    if (sanitizedTitle.length < 3) {
      return { isValid: false, error: 'Title must be at least 3 characters long' };
    }
    
    // Sanitize description if provided
    let sanitizedDescription = null;
    if (description && typeof description === 'string') {
      sanitizedDescription = sanitizeString(description, 1000);
    }
    
    // Validate and sanitize options
    if (!Array.isArray(options)) {
      return { isValid: false, error: 'Options must be an array' };
    }
    
    if (options.length < 2 || options.length > 10) {
      return { isValid: false, error: 'Must have between 2 and 10 options' };
    }
    
    const sanitizedOptions = sanitizeArray(options, 10, 200);
    if (sanitizedOptions.length < 2) {
      return { isValid: false, error: 'At least 2 valid options are required' };
    }
    
    // Check for duplicate options
    const uniqueOptions = Array.from(new Set(sanitizedOptions));
    if (uniqueOptions.length !== sanitizedOptions.length) {
      return { isValid: false, error: 'Duplicate options are not allowed' };
    }
    
    // Validate expiration date if provided
    let parsedExpiresAt = null;
    if (expires_at) {
      const { isValid, parsedDate } = validateFutureDate(expires_at);
      if (!isValid) {
        return { isValid: false, error: 'Expiration date must be in the future' };
      }
      parsedExpiresAt = parsedDate;
    }
    
    return {
      isValid: true,
      sanitizedData: {
        title: sanitizedTitle,
        description: sanitizedDescription,
        expires_at: parsedExpiresAt?.toISOString() || null,
        options: sanitizedOptions
      }
    };
  } catch (error: any) {
    return { isValid: false, error: error.message || 'Invalid input data' };
  }
}

export function validateVoteInput(body: any): { isValid: boolean; error?: string; sanitizedData?: any } {
  try {
    const { optionId } = body;
    
    // Validate required fields
    const requiredFieldError = validateRequiredFields(body, ['optionId']);
    if (requiredFieldError) {
      return { isValid: false, error: requiredFieldError };
    }
    
    // Validate optionId format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof optionId !== 'string' || !uuidRegex.test(optionId)) {
      return { isValid: false, error: 'Invalid option ID format' };
    }
    
    return {
      isValid: true,
      sanitizedData: { optionId: optionId.toLowerCase() }
    };
  } catch (error: any) {
    return { isValid: false, error: error.message || 'Invalid vote data' };
  }
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