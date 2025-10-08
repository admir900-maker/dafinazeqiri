/**
 * Error Logging and Monitoring Utilities
 * Provides centralized error logging, monitoring, and reporting capabilities
 */

export interface ErrorContext {
  userId?: string;
  route?: string;
  action?: string;
  eventId?: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  userAgent?: string;
  timestamp?: string;
  source?: string;
}

export interface ErrorLog {
  id: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  error?: Error | any;
  context?: ErrorContext;
  timestamp: string;
  source: 'client' | 'server';
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorLog[] = [];
  private maxLogs = 1000; // Maximum number of logs to keep in memory

  private constructor() { }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with context
   */
  error(message: string, error?: Error | any, context?: ErrorContext): void {
    this.log('error', message, error, context);

    // In production, you would send this to an external service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService('error', message, error, context);
    }
  }

  /**
   * Log a warning
   */
  warn(message: string, error?: Error | any, context?: ErrorContext): void {
    this.log('warn', message, error, context);
  }

  /**
   * Log info
   */
  info(message: string, context?: ErrorContext): void {
    this.log('info', message, undefined, context);
  }

  /**
   * Internal log method
   */
  private log(level: 'error' | 'warn' | 'info', message: string, error?: Error | any, context?: ErrorContext): void {
    const logEntry: ErrorLog = {
      id: this.generateId(),
      level,
      message,
      error: error ? this.serializeError(error) : undefined,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
      },
      timestamp: new Date().toISOString(),
      source: typeof window !== 'undefined' ? 'client' : 'server'
    };

    this.logs.push(logEntry);

    // Keep only the latest logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      consoleMethod(`[${level.toUpperCase()}] ${message}`, error, context);
    }
  }

  /**
   * Send error to external monitoring service
   */
  private async sendToExternalService(level: string, message: string, error?: Error | any, context?: ErrorContext): Promise<void> {
    try {
      // Example integrations (choose one or implement custom):

      // 1. Sentry
      // if (typeof window !== 'undefined' && window.Sentry) {
      //   window.Sentry.captureException(error || new Error(message), {
      //     level: level as any,
      //     contexts: { custom: context }
      //   });
      // }

      // 2. LogRocket
      // if (typeof window !== 'undefined' && window.LogRocket) {
      //   window.LogRocket.captureException(error || new Error(message));
      // }

      // 3. Custom endpoint
      if (process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level,
            message,
            error: error ? this.serializeError(error) : null,
            context,
            timestamp: new Date().toISOString()
          })
        });
      }
    } catch (reportingError) {
      // Fallback to console if external service fails
      console.error('Failed to send error to external service:', reportingError);
    }
  }

  /**
   * Serialize error objects for logging
   */
  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any)
      };
    }
    return error;
  }

  /**
   * Generate unique ID for log entries
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get recent logs (for debugging or admin dashboard)
   */
  getLogs(limit?: number): ErrorLog[] {
    return limit ? this.logs.slice(-limit) : this.logs;
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: 'error' | 'warn' | 'info', limit?: number): ErrorLog[] {
    const filtered = this.logs.filter(log => log.level === level);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get error statistics
   */
  getStats(): { total: number; errors: number; warnings: number; info: number } {
    return {
      total: this.logs.length,
      errors: this.logs.filter(log => log.level === 'error').length,
      warnings: this.logs.filter(log => log.level === 'warn').length,
      info: this.logs.filter(log => log.level === 'info').length
    };
  }
}

// Export singleton instance
export const logger = ErrorLogger.getInstance();

// Convenience functions for common use cases
export const logError = (message: string, error?: Error | any, context?: ErrorContext) => {
  logger.error(message, error, context);
};

export const logWarning = (message: string, error?: Error | any, context?: ErrorContext) => {
  logger.warn(message, error, context);
};

export const logInfo = (message: string, context?: ErrorContext) => {
  logger.info(message, context);
};

// API endpoint helper for server-side logging
export const logApiError = (
  message: string,
  error?: Error | any,
  route?: string,
  userId?: string,
  action?: string,
  metadata?: Record<string, any>
) => {
  logger.error(message, error, {
    route,
    userId,
    action,
    metadata,
    source: 'api'
  });
};

// Database operation helper
export const logDatabaseError = (
  operation: string,
  collection: string,
  error: Error | any,
  userId?: string
) => {
  logger.error(`Database operation failed: ${operation} on ${collection}`, error, {
    action: 'database',
    metadata: { operation, collection },
    userId
  });
};

// Payment operation helper
export const logPaymentError = (
  operation: string,
  paymentId: string,
  error: Error | any,
  userId?: string,
  amount?: number
) => {
  logger.error(`Payment operation failed: ${operation}`, error, {
    action: 'payment',
    metadata: { operation, paymentId, amount },
    userId
  });
};

// Email operation helper
export const logEmailError = (
  operation: string,
  recipient: string,
  error: Error | any,
  emailType?: string
) => {
  logger.error(`Email operation failed: ${operation}`, error, {
    action: 'email',
    metadata: { operation, recipient, emailType }
  });
};

export default logger;