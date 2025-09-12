enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

class Logger {
  private static logLevel: LogLevel = LogLevel.INFO;
  private static isVercel: boolean = false;
  private static isLoggingEnabled: boolean = true;

  static configure(options: { 
    level?: LogLevel 
  } = {}) {
    if (options.level) {
      this.logLevel = options.level;
    }
  }

  private static shouldLog(level: LogLevel): boolean {
    // Only log if logging is enabled and log level is appropriate
    if (!this.isLoggingEnabled) return false;

    const logLevels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    return logLevels.indexOf(level) <= logLevels.indexOf(this.logLevel);
  }

  private static formatLogMessage(level: LogLevel, message: string, context?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `${timestamp} [${level}] ${message}${contextStr}`;
  }

  private static log(level: LogLevel, message: string, context?: Record<string, any>) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatLogMessage(level, message, context);

    // Always log to console
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.log(formattedMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
    }
  }

  static error(message: string, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context);
  }

  static warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  static info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  static debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  static performance(metricName: string, duration: number, additionalContext: Record<string, any> = {}) {
    this.log(LogLevel.INFO, `Performance Metric: ${metricName}`, {
      duration,
      ...additionalContext
    });
  }

  static userActivity(userId: number | null, action: string, entityType: string, entityId?: number, details: Record<string, any> = {}) {
    this.log(LogLevel.INFO, `User Activity: ${action} on ${entityType}`, {
      userId,
      entityId,
      ...details
    });
  }
}

// Configure logger based on environment
Logger.configure({
  level: LogLevel.DEBUG
});

export default Logger;
