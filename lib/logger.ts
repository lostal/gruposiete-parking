/**
 * Sistema de logging estructurado
 * Centraliza todos los logs para facilitar migración a servicios como Sentry, LogTail, etc.
 */

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

interface LogContext {
  [key: string]: unknown;
  userId?: string;
  requestId?: string;
  endpoint?: string;
  ip?: string;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp: string;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  /**
   * Formatea el log entry para salida
   */
  private format(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const message = entry.message;

    if (this.isDevelopment) {
      // En desarrollo, formato legible
      let output = `[${timestamp}] ${level} ${message}`;
      if (entry.context && Object.keys(entry.context).length > 0) {
        output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
      }
      if (entry.error) {
        output += `\n  Error: ${entry.error.stack || entry.error.message}`;
      }
      return output;
    } else {
      // En producción, JSON estructurado para fácil parsing
      return JSON.stringify({
        timestamp,
        level: entry.level,
        message,
        context: entry.context,
        error: entry.error
          ? {
              message: entry.error.message,
              stack: entry.error.stack,
              name: entry.error.name,
            }
          : undefined,
      });
    }
  }

  /**
   * Log genérico
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    const entry: LogEntry = {
      level,
      message,
      context,
      error,
      timestamp: new Date().toISOString(),
    };

    const formatted = this.format(entry);

    // Enviar a consola apropiada
    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formatted);
        }
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted);
        break;
    }

    // TODO: En producción, enviar también a servicio externo (Sentry, LogTail, etc.)
    if (
      !this.isDevelopment &&
      (level === LogLevel.ERROR || level === LogLevel.FATAL)
    ) {
      // Aquí integrar Sentry o servicio de logging
      // Example: Sentry.captureException(error, { contexts: context });
    }
  }

  /**
   * Debug - Solo en desarrollo
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info - Información general
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning - Advertencias que no son errores
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error - Errores recuperables
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Fatal - Errores críticos que requieren atención inmediata
   */
  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Helper para loguear requests de API
   */
  apiRequest(method: string, endpoint: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${endpoint}`, {
      ...context,
      endpoint,
      method,
    });
  }

  /**
   * Helper para loguear respuestas de API
   */
  apiResponse(
    method: string,
    endpoint: string,
    status: number,
    duration?: number,
    context?: LogContext
  ): void {
    const level =
      status >= 500
        ? LogLevel.ERROR
        : status >= 400
        ? LogLevel.WARN
        : LogLevel.INFO;

    this.log(level, `API Response: ${method} ${endpoint} - ${status}`, {
      ...context,
      endpoint,
      method,
      status,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  /**
   * Helper para loguear operaciones de DB
   */
  dbOperation(
    operation: string,
    collection: string,
    duration?: number,
    context?: LogContext
  ): void {
    this.debug(`DB Operation: ${operation} on ${collection}`, {
      ...context,
      operation,
      collection,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  /**
   * Helper para loguear autenticación
   */
  authEvent(event: string, success: boolean, context?: LogContext): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    this.log(level, `Auth Event: ${event}`, {
      ...context,
      event,
      success,
    });
  }
}

// Exportar instancia singleton
export const logger = new Logger();

// Helper para obtener contexto de request
export function getRequestContext(request: Request): LogContext {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}
