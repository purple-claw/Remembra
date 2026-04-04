/**
 * Enterprise-grade error handling utilities
 * Provides standardized error codes, custom error class, and result types
 * for consistent error handling across the application.
 */

export const ErrorCode = {
  // Client/validation errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  BAD_REQUEST: 'BAD_REQUEST',

  // Server/system errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // Application-specific
  AUTH_FAILED: 'AUTH_FAILED',
  FIREBASE_ERROR: 'FIREBASE_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ErrorProps {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  retryable?: boolean;
  context?: Record<string, any>;
}

/**
 * Standardized application error class
 * All errors should be instances of AppError for consistent handling
 */
export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  retryable: boolean;
  context: Record<string, any>;
  timestamp: Date;
  originalError?: Error;

  constructor(props: ErrorProps) {
    super(props.message);
    Object.setPrototypeOf(this, AppError.prototype);

    this.code = props.code;
    this.statusCode = props.statusCode ?? 500;
    this.retryable = props.retryable ?? false;
    this.context = props.context ?? {};
    this.timestamp = new Date();

    // Capture stack trace for V8 engines (Node.js, Chrome, etc.)
    // In browser environments, this will be no-op
    const Error_captureStackTrace = (Error as any).captureStackTrace;
    if (typeof Error_captureStackTrace === 'function') {
      Error_captureStackTrace(this, this.constructor);
    }
  }

  isRetryable(): boolean {
    return this.retryable || this.statusCode >= 500;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.isRetryable(),
      context: this.context,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Result type for operations that may fail
 * Enables type-safe error handling without exceptions
 */
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<E = AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true;
}

export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * Create AppError from unknown error source
 * Used to standardize errors from external APIs, Firebase, etc.
 */
export function createAppError(
  error: unknown,
  context?: { code?: ErrorCode; message?: string; context?: Record<string, any> }
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // Firebase errors
  if (
    error instanceof Error &&
    error.message?.includes('Firebase')
  ) {
    return new AppError({
      code: ErrorCode.FIREBASE_ERROR,
      message: context?.message ?? error.message,
      statusCode: 500,
      retryable: error.message?.includes('PERMISSION_DENIED') || error.message?.includes('UNAVAILABLE') || false,
      context: {
        originalMessage: error.message,
        ...context?.context,
      },
    });
  }

  // Network errors
  if (
    error instanceof Error &&
    (error.message?.includes('fetch') || error.message?.includes('Network'))
  ) {
    return new AppError({
      code: ErrorCode.NETWORK_ERROR,
      message: context?.message ?? 'Network request failed',
      statusCode: 0,
      retryable: true,
      context: {
        originalMessage: error.message,
        ...context?.context,
      },
    });
  }

  // Generic errors
  return new AppError({
    code: context?.code ?? ErrorCode.INTERNAL_ERROR,
    message: context?.message ?? (error instanceof Error ? error.message : 'Unknown error'),
    statusCode: 500,
    retryable: false,
    context: {
      originalError: error instanceof Error ? error.message : String(error),
      ...context?.context,
    },
  });
}

/**
 * Error boundary for wrapping operations with consistent error handling
 * Usage: await errorBoundary(async () => { ... }, { code: ErrorCode.DATABASE_ERROR })
 */
export async function errorBoundary<T>(
  operation: () => Promise<T>,
  errorContext?: { code?: ErrorCode; message?: string; context?: Record<string, any> }
): Promise<Result<T>> {
  try {
    const data = await operation();
    return success(data);
  } catch (error) {
    return failure(createAppError(error, errorContext));
  }
}

/**
 * Check if error is retryable (transient failure)
 */
export function isRetryable(error: AppError): boolean {
  return error.isRetryable() || isTransientError(error.code);
}

function isTransientError(code: ErrorCode): boolean {
  const transientCodes: ErrorCode[] = [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT,
    ErrorCode.SERVICE_UNAVAILABLE,
    ErrorCode.DATABASE_ERROR, // some DB errors are transient
  ];
  return transientCodes.includes(code);
}

/**
 * Human-readable error messages (for UI display)
 */
export function getErrorMessage(error: AppError | unknown): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case ErrorCode.NOT_FOUND:
        return 'Item not found. It may have been deleted.';
      case ErrorCode.UNAUTHORIZED:
        return 'You are not authorized to perform this action.';
      case ErrorCode.VALIDATION_ERROR:
        return `Invalid input: ${error.message}`;
      case ErrorCode.NETWORK_ERROR:
        return 'Network connection failed. Please check your internet connection.';
      case ErrorCode.TIMEOUT:
        return 'Operation timed out. Please try again.';
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 'Service is temporarily unavailable. Please try again later.';
      default:
        return error.message || 'Something went wrong. Please try again.';
    }
  }

  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}
