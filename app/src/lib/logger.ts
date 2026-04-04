/**
 * Enterprise-grade logging infrastructure
 * Provides consistent logging across services with multiple transports
 * and configurable levels based on environment.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';

export interface LogContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  duration?: number;
  stack?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  trace(message: string, context?: LogContext): void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

/**
 * Console-based logger with environment-aware filtering
 * In production, integrate with external services (Sentry, DataDog, etc.)
 */
class ConsoleLogger implements Logger {
  private isDev = import.meta.env.DEV;
  private minLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'info';
  private enablePerformanceMetrics = import.meta.env.DEV;

  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  trace(message: string, context?: LogContext): void {
    this.log('trace', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, {
      ...context,
      error: error?.message,
      stack: error?.stack,
    });

    // In production, send to error tracking service
    if (!this.isDev) {
      this.reportError(message, error, context);
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // Color-coded console output
    const styles = this.getConsoleStyles(level);
    const contextStr = context ? JSON.stringify(context, null, 2) : '';

    if (this.isDev && context) {
      console.log(`%c${formattedMessage}`, styles, context);
    } else {
      const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[method](formattedMessage, contextStr);
    }

    // Track performance metrics
    if (this.enablePerformanceMetrics && context?.duration) {
      this.trackMetric(message, context.duration);
    }
  }

  private getConsoleStyles(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      trace: 'color: gray; font-style: italic;',
      debug: 'color: #666;',
      info: 'color: #0066cc; font-weight: bold;',
      warn: 'color: #ff9900; font-weight: bold;',
      error: 'color: #cc0000; font-weight: bold;',
    };
    return styles[level];
  }

  private trackMetric(operation: string, duration: number) {
    // Log performance metrics
    if (duration > 1000) {
      console.warn(`⚠️ Slow operation: ${operation} took ${duration}ms`);
    }
  }

  private reportError(message: string, error?: Error, context?: LogContext) {
    // Integration point for Sentry, DataDog, LogRocket, etc.
    // Example:
    // Sentry.captureException(error, { contexts: { custom: context } });
    
    // For now, just send to console in production
    console.error('[PROD ERROR]', message, error, context);
  }
}

/**
 * Global logger instance
 * Use this in all services and components for consistent logging
 */
export const logger = new ConsoleLogger();

/**
 * Performance timer utility
 * Usage: const timer = startTimer(); ... timer.end('operation name');
 */
export function startTimer() {
  const start = performance.now();

  return {
    end(operation: string, context?: LogContext) {
      const duration = performance.now() - start;
      logger.debug(`${operation} completed`, {
        ...context,
        duration: Math.round(duration),
      });
      return duration;
    },

    endWarn(operation: string, threshold = 1000, context?: LogContext) {
      const duration = performance.now() - start;
      if (duration > threshold) {
        logger.warn(`${operation} took ${Math.round(duration)}ms (threshold: ${threshold}ms)`, {
          ...context,
          duration: Math.round(duration),
        });
      }
      return duration;
    },
  };
}

/**
 * Configure logger for different environments
 */
export function configureLogger(options: { minLevel?: LogLevel; isDev?: boolean }) {
  if (options.minLevel) {
    logger.setMinLevel(options.minLevel);
  }
}

/**
 * Log async operation wrapper
 */
export function withLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const timer = startTimer();

  logger.info(`Starting: ${operation}`, context);

  return fn()
    .then((result) => {
      const duration = timer.end(operation, context);
      logger.trace(`Completed: ${operation}`, { ...context, duration });
      return result;
    })
    .catch((error) => {
      logger.error(`Failed: ${operation}`, error, context);
      throw error;
    });
}
