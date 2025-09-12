/* Lightweight server-side logger for the API runtime (Vercel/Node). */

export type LogContext = Record<string, any> | undefined;

enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

function fmt(level: LogLevel, message: string, context?: LogContext) {
  const ts = new Date().toISOString();
  const ctx = context ? ` ${JSON.stringify(context)}` : '';
  return `${ts} [${level}] ${message}${ctx}`;
}

const Logger = {
  error(message: string, context?: LogContext) {
    console.error(fmt(LogLevel.ERROR, message, context));
  },
  warn(message: string, context?: LogContext) {
    console.warn(fmt(LogLevel.WARN, message, context));
  },
  info(message: string, context?: LogContext) {
    console.log(fmt(LogLevel.INFO, message, context));
  },
  debug(message: string, context?: LogContext) {
    console.debug(fmt(LogLevel.DEBUG, message, context));
  },
};

export default Logger;
