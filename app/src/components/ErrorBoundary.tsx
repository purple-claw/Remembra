/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI instead of crashing the entire app.
 * Integrates with the standardized error handling system.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary onError={handleError}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */

import React, { type ErrorInfo, type ReactNode } from 'react';
import { logger as appLogger } from '../lib/logger';
import type { AppError } from '../lib/errors';
import { createAppError } from '../lib/errors';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional callback when error is caught */
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  /** Optional fallback UI to render when error occurs */
  fallback?: (error: AppError, reset: () => void) => ReactNode;
  /** Optional error boundary name for logging context */
  name?: string;
}

interface ErrorBoundaryState {
  error: AppError | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

const logger = appLogger;

/**
 * Error Boundary Component using React Class Component.
 * Functional components can't catch errors, so this must be a class component.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  /**
   * Update state so the next render will show the fallback UI.
   * This is called after an error has been thrown by a descendant component.
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      error: createAppError(error),
    };
  }

  /**
   * Log the error to an error reporting service.
   * This is called after an error has been thrown by a descendant component.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const appError = createAppError(error);
    const infoString = Object.keys(errorInfo)
      .map((key) => `${key}: ${JSON.stringify(errorInfo[key as keyof ErrorInfo])}`)
      .join('; ');

    // Log error details
    logger.error(`Error caught by boundary: ${this.props.name || 'ErrorBoundary'}`, appError as any, {
      errorInfo: infoString,
      componentStack: errorInfo.componentStack,
    });

    // Update state with error details
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Call optional error handler callback
    if (this.props.onError && this.state.error) {
      this.props.onError(this.state.error, errorInfo);
    }

    // In production, you could send error to a monitoring service here
    // Example:
    // if (process.env.NODE_ENV === 'production') {
    //   reportErrorToService(appError, errorInfo);
    // }
  }

  /**
   * Reset the error boundary to its initial state.
   * Allows user to retry after an error.
   */
  resetError = (): void => {
    logger.info('Error boundary reset', {
      previousError: this.state.error?.message,
      errorCount: this.state.errorCount,
    });

    this.setState({
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default error UI
      return <DefaultErrorFallback error={this.state.error} onReset={this.resetError} />;
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI Component
 * Displayed when an error is caught and no custom fallback is provided.
 */
interface DefaultErrorFallbackProps {
  error: AppError;
  onReset: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({ error, onReset }) => {
  const isDevelopment = import.meta.env.DEV;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Error Icon */}
      <div
        style={{
          fontSize: '64px',
          marginBottom: '20px',
          opacity: 0.8,
        }}
      >
        ⚠️
      </div>

      {/* Error Title */}
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '10px',
          color: '#1e293b',
        }}
      >
        Something went wrong
      </h1>

      {/* Error Message */}
      <p
        style={{
          fontSize: '16px',
          color: '#64748b',
          marginBottom: '20px',
          maxWidth: '500px',
          textAlign: 'center',
          lineHeight: '1.6',
        }}
      >
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>

      {/* Error Code */}
      <div
        style={{
          backgroundColor: '#e2e8f0',
          padding: '12px 16px',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#475569',
          marginBottom: '20px',
          fontFamily: 'monospace',
        }}
      >
        Error Code: {error.code}
      </div>

      {/* Debug Info (Development Only) */}
      {isDevelopment && (
        <details
          style={{
            width: '100%',
            maxWidth: '600px',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#475569',
          }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
            Debug Information
          </summary>
          <pre
            style={{
              backgroundColor: '#f1f5f9',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '11px',
              color: '#1e293b',
              marginTop: '10px',
            }}
          >
            {JSON.stringify(
              {
                code: error.code,
                message: error.message,
                statusCode: error.statusCode,
                retryable: error.retryable,
                context: error.context,
                timestamp: error.timestamp,
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}

      {/* Help Message */}
      <p
        style={{
          fontSize: '14px',
          color: '#64748b',
          marginBottom: '30px',
          textAlign: 'center',
        }}
      >
        Try refreshing the page or contact support if the problem persists.
      </p>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={onReset}
          style={{
            padding: '10px 20px',
            backgroundColor: '#FF8000',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#E67E00';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#FF8000';
          }}
        >
          Try Again
        </button>

        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '10px 20px',
            backgroundColor: '#64748b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#475569';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#64748b';
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

/**
 * Hook to manually trigger error boundary.
 * Use this in functional components to throw errors that will be caught by ErrorBoundary.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const throwError = useErrorHandler();
 *   return (
 *     <button onClick={() => throwError(new Error('Test error'))}>
 *       Trigger Error
 *     </button>
 *   );
 * }
 * ```
 */
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}

export default ErrorBoundary;
