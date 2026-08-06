
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogEntry {
  event: string;
  level: LogLevel;
  timestamp: string;
  traceId?: string;
  conversationKey?: string;
  module?: string;
  code?: string;
  metadata?: Record<string, any>;
  message?: string;
}

const sensitiveKeys = ['token', 'key', 'password', 'secret', 'cpf', 'phone', 'email'];

function sanitize(data: any): any {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }
  
  return sanitized;
}

export const logger = {
  log(level: LogLevel, event: string, message?: string, metadata?: Record<string, any>, options?: Partial<LogEntry>) {
    const entry: LogEntry = {
      event,
      level,
      timestamp: new Date().toISOString(),
      message,
      metadata: sanitize(metadata),
      ...options
    };

    const logFn = level === 'error' || level === 'critical' ? console.error : level === 'warn' ? console.warn : console.log;
    logFn(`[${entry.timestamp}] [${level.toUpperCase()}] [${event}] ${message || ''}`, JSON.stringify(entry.metadata || {}));
  },

  debug(event: string, message?: string, metadata?: Record<string, any>) {
    this.log('debug', event, message, metadata);
  },

  info(event: string, message?: string, metadata?: Record<string, any>) {
    this.log('info', event, message, metadata);
  },

  warn(event: string, message?: string, metadata?: Record<string, any>) {
    this.log('warn', event, message, metadata);
  },

  error(event: string, message?: string, metadata?: Record<string, any>) {
    this.log('error', event, message, metadata);
  },

  critical(event: string, message?: string, metadata?: Record<string, any>) {
    this.log('critical', event, message, metadata);
  }
};
