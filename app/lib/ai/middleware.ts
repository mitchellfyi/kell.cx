import { NextRequest, NextResponse } from 'next/server';

export interface AIError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export class AIServiceError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(error: AIError) {
    super(error.message);
    this.code = error.code;
    this.statusCode = error.statusCode;
    this.details = error.details;
  }
}

// Error types
export const AI_ERRORS = {
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests',
    statusCode: 429,
  },
  INVALID_API_KEY: {
    code: 'INVALID_API_KEY',
    message: 'Invalid or missing API key',
    statusCode: 401,
  },
  TOKEN_LIMIT_EXCEEDED: {
    code: 'TOKEN_LIMIT_EXCEEDED',
    message: 'Monthly token limit exceeded',
    statusCode: 429,
  },
  INVALID_REQUEST: {
    code: 'INVALID_REQUEST',
    message: 'Invalid request data',
    statusCode: 400,
  },
  SERVICE_ERROR: {
    code: 'SERVICE_ERROR',
    message: 'AI service error',
    statusCode: 500,
  },
} as const;

// Middleware for AI routes
export async function aiMiddleware(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Add request ID for tracking
    const requestId = crypto.randomUUID();
    request.headers.set('x-request-id', requestId);

    // Check for API key in production
    if (process.env.NODE_ENV === 'production' && !process.env.ANTHROPIC_API_KEY) {
      throw new AIServiceError(AI_ERRORS.INVALID_API_KEY);
    }

    // Call the handler
    const response = await handler(request);

    // Add request ID to response
    response.headers.set('x-request-id', requestId);

    return response;
  } catch (error) {
    // Handle known AI service errors
    if (error instanceof AIServiceError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: error.statusCode }
      );
    }

    // Handle rate limit errors
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return NextResponse.json(
        {
          error: {
            code: AI_ERRORS.RATE_LIMIT_EXCEEDED.code,
            message: error.message,
          },
        },
        { status: 429 }
      );
    }

    // Handle other errors
    console.error('Unhandled AI error:', error);
    return NextResponse.json(
      {
        error: {
          code: AI_ERRORS.SERVICE_ERROR.code,
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}