/**
 * Base Service Abstract Class
 * Provides standardized error handling, logging, and validation for all services.
 * Services should extend this class to inherit consistent patterns for:
 * - Error handling and standardization
 * - Structured logging with context
 * - Input validation
 * - Result-based return types
 */

import type { Logger } from './logger';
import { logger } from './logger';
import type { Result } from './errors';
import { AppError, success, failure } from './errors';
import { createAppError } from './errors';

export interface ServiceConfig {
  serviceName: string;
  enableLogging?: boolean;
  enablePerformanceTracking?: boolean;
}

/**
 * Abstract base class for all services.
 * Provides uniform error handling, logging, and validation patterns.
 *
 * @example
 * ```typescript
 * class UserService extends BaseService {
 *   async getUser(id: string): Promise<Result<User>> {
 *     return this.executeWithLogging(async () => {
 *       this.validateId(id);
 *       const user = await this.repository.getUser(id);
 *       return user ? success(user) : failure('User not found');
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseService {
  protected logger: Logger;
  protected config: Required<ServiceConfig>;

  constructor(config: ServiceConfig) {
    this.config = {
      serviceName: config.serviceName,
      enableLogging: config.enableLogging ?? true,
      enablePerformanceTracking: config.enablePerformanceTracking ?? true,
    };

    this.logger = logger;
  }

  /**
   * Execute an async operation with automatic logging and error handling.
   * Wraps the operation with contextual logging and standardizes error handling.
   *
   * @param operation - The async operation to execute
   * @param context - Optional context object for logging
   * @returns Result<T> - Success or standardized error
   */
  protected async executeWithLogging<T>(
    operation: () => Promise<Result<T>>,
    context?: Record<string, any>,
  ): Promise<Result<T>> {
    const operationName = operation.name || 'anonymous';
    const startTime = this.config.enablePerformanceTracking ? performance.now() : null;

    if (this.config.enableLogging) {
      this.logger.debug(`[${this.config.serviceName}] Executing ${operationName}`, context);
    }

    try {
      const result = await operation();

      if (this.config.enablePerformanceTracking && startTime !== null) {
        const duration = performance.now() - startTime;
        this.logger.debug(`[${this.config.serviceName}] ${operationName} completed in ${duration.toFixed(2)}ms`, {
          ...context,
          duration,
        });
      }

      return result;
    } catch (error) {
      const appError = createAppError(error);

      if (this.config.enableLogging) {
        this.logger.error(`[${this.config.serviceName}] ${operationName} failed`, appError as any, {
          ...context,
          retryable: appError.retryable,
        });
      }

      return failure(appError);
    }
  }

  /**
   * Execute a synchronous operation with logging and error handling.
   * Useful for sync operations that still need standardized error handling.
   *
   * @param operation - The sync operation to execute
   * @param context - Optional context for logging
   * @returns Result<T> - Success or standardized error
   */
  protected executeSync<T>(
    operation: () => T,
    context?: Record<string, any>,
  ): Result<T> {
    const operationName = operation.name || 'anonymous';

    if (this.config.enableLogging) {
      this.logger.debug(`[${this.config.serviceName}] Executing ${operationName}`, context);
    }

    try {
      return success(operation());
    } catch (error) {
      const appError = createAppError(error);

      if (this.config.enableLogging) {
        this.logger.error(`[${this.config.serviceName}] ${operationName} failed`, appError as any, context);
      }

      return failure(appError);
    }
  }

  /**
   * Validate that a value is not null or undefined.
   * Throws AppError if validation fails.
   *
   * @param value - Value to check
   * @param fieldName - Name of field for error message
   * @throws AppError with VALIDATION_ERROR code
   */
  protected requireNotNull<T>(value: T | null | undefined, fieldName: string): T {
    if (value === null || value === undefined) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `${fieldName} is required`,
        statusCode: 400,
      });
    }
    return value;
  }

  /**
   * Validate that a string is not empty.
   * Throws AppError if validation fails.
   *
   * @param value - String value to check
   * @param fieldName - Name of field for error message
   * @throws AppError with VALIDATION_ERROR code
   */
  protected requireNonEmpty(value: string, fieldName: string): string {
    if (!value || value.trim().length === 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `${fieldName} cannot be empty`,
        statusCode: 400,
      });
    }
    return value.trim();
  }

  /**
   * Validate that a string matches minimum length.
   * Throws AppError if validation fails.
   *
   * @param value - String value to check
   * @param minLength - Minimum required length
   * @param fieldName - Name of field for error message
   * @throws AppError with VALIDATION_ERROR code
   */
  protected validateMinLength(value: string, minLength: number, fieldName: string): string {
    if (value.length < minLength) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `${fieldName} must be at least ${minLength} characters`,
        statusCode: 400,
      });
    }
    return value;
  }

  /**
   * Validate that a string matches maximum length.
   * Throws AppError if validation fails.
   *
   * @param value - String value to check
   * @param maxLength - Maximum allowed length
   * @param fieldName - Name of field for error message
   * @throws AppError with VALIDATION_ERROR code
   */
  protected validateMaxLength(value: string, maxLength: number, fieldName: string): string {
    if (value.length > maxLength) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `${fieldName} cannot exceed ${maxLength} characters`,
        statusCode: 400,
      });
    }
    return value;
  }

  /**
   * Validate that a value matches one of allowed values (enum validation).
   * Throws AppError if validation fails.
   *
   * @param value - Value to check
   * @param allowedValues - Array of allowed values
   * @param fieldName - Name of field for error message
   * @throws AppError with VALIDATION_ERROR code
   */
  protected validateEnum<T>(value: T, allowedValues: T[], fieldName: string): T {
    if (!allowedValues.includes(value)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        statusCode: 400,
      });
    }
    return value;
  }

  /**
   * Validate that an email address format is valid.
   * Basic email validation (not RFC compliant, just practical).
   * Throws AppError if validation fails.
   *
   * @param email - Email address to validate
   * @throws AppError with VALIDATION_ERROR code
   */
  protected validateEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid email address format',
        statusCode: 400,
      });
    }
    return email;
  }

  /**
   * Validate that an ID is a valid Firebase-style ID (non-empty string).
   * Throws AppError if validation fails.
   *
   * @param id - ID to validate
   * @param fieldName - Name of field for error message
   * @throws AppError with VALIDATION_ERROR code
   */
  protected validateId(id: string, fieldName: string = 'ID'): string {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `${fieldName} must be a non-empty string`,
        statusCode: 400,
      });
    }
    return id.trim();
  }

  /**
   * Validate that a value is an object.
   * Throws AppError if validation fails.
   *
   * @param value - Value to check
   * @param fieldName - Name of field for error message
   * @throws AppError with VALIDATION_ERROR code
   */
  protected validateObject<T extends object>(value: unknown, fieldName: string): T {
    if (typeof value !== 'object' || value === null) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `${fieldName} must be an object`,
        statusCode: 400,
      });
    }
    return value as T;
  }

  /**
   * Validate that a value is a number within bounds.
   * Throws AppError if validation fails.
   *
   * @param value - Value to check
   * @param min - Minimum allowed value (inclusive)
   * @param max - Maximum allowed value (inclusive)
   * @param fieldName - Name of field for error message
   * @throws AppError with VALIDATION_ERROR code
   */
  protected validateNumberRange(
    value: number,
    min: number,
    max: number,
    fieldName: string,
  ): number {
    if (value < min || value > max) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `${fieldName} must be between ${min} and ${max}`,
        statusCode: 400,
      });
    }
    return value;
  }

  /**
   * Handle a potential Firebase error and convert to standardized format.
   * Extracts error code and message from Firebase error objects.
   *
   * @param error - Firebase error object
   * @returns AppError - Standardized error
   */
  protected handleFirebaseError(error: any): AppError {
    if (error?.code) {
      // Firebase error codes like 'auth/user-not-found'
      const parts = (error.code as string).split('/');
      const code = parts[1] || parts[0];

      const statusCodeMap: Record<string, number> = {
        'permission-denied': 403,
        'not-found': 404,
        'already-exists': 409,
        'invalid-argument': 400,
        'unauthenticated': 401,
        'internal': 500,
      };

      return new AppError({
        code: 'FIREBASE_ERROR',
        message: error.message || 'Firebase operation failed',
        statusCode: statusCodeMap[code] || 500,
        context: { firebaseCode: error.code },
      });
    }

    return createAppError(error);
  }

  /**
   * Sanitize user input to prevent XSS attacks.
   * Removes dangerous HTML and scripts.
   *
   * @param input - Raw user input
   * @returns string - Sanitized input
   */
  protected sanitizeInput(input: string): string {
    if (!input) return '';

    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Paginate array results.
   * Useful for handling front-end pagination of service results.
   *
   * @param items - Full array of items
   * @param pageNumber - Page number (1-indexed)
   * @param pageSize - Items per page
   * @returns Object with items and pagination metadata
   */
  protected paginate<T>(
    items: T[],
    pageNumber: number,
    pageSize: number,
  ): { items: T[]; totalPages: number; currentPage: number; totalItems: number } {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      items: items.slice(startIndex, endIndex),
      totalPages,
      currentPage: pageNumber,
      totalItems,
    };
  }

  /**
   * Format validation errors into a readable message.
   * Aggregates multiple validation errors into a single message.
   *
   * @param errors - Object with field names as keys and error messages as values
   * @returns string - Formatted error message
   */
  protected formatValidationErrors(errors: Record<string, string>): string {
    return Object.entries(errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join('; ');
  }
}
