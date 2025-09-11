import fs from 'fs';
import path from 'path';

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
  private static logFile: string | null = null;

  static configure(options: { 
    level?: LogLevel, 
    logFilePath?: string 
  } = {}) {
    if (options.level) {
      this.logLevel = options.level;
    }
    if (options.logFilePath) {
      this.logFile = path.resolve(options.logFilePath);
    }
  }

  private static shouldLog(level: LogLevel): boolean {
    const logLevels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    return logLevels.indexOf(level) <= logLevels.indexOf(this.logLevel);
  }

  private static writeToFile(entry: LogEntry) {
    if (!this.logFile) return;

    try {
      const logEntry = `${entry.timestamp} [${entry.level}] ${entry.message} ${entry.context ? JSON.stringify(entry.context) : ''}\n`;
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private static log(level: LogLevel, message: string, context?: Record<string, any>) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context
    };

    // Console logging
    switch (level) {
      case LogLevel.ERROR:
        console.error(`[${level}] ${message}`, context || {});
        break;
      case LogLevel.WARN:
        console.warn(`[${level}] ${message}`, context || {});
        break;
      case LogLevel.INFO:
        console.log(`[${level}] ${message}`, context || {});
        break;
      case LogLevel.DEBUG:
        console.debug(`[${level}] ${message}`, context || {});
        break;
    }

    // File logging
    this.writeToFile(entry);
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
  level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
  logFilePath: process.env.NODE_ENV === 'production' 
    ? '/var/log/aarez-mgnmt/app.log' 
    : './logs/app.log'
});

export default Logger;
