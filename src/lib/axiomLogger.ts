import { Axiom } from '@axiomhq/js';

interface LogEntry {
  level: string;
  message: string;
  environment: string;
  [key: string]: any;
}

class AxiomLogger {
  private dataset: string;
  private axiom: Axiom;

  constructor() {
    this.dataset = process.env.VITE_AXIOM_DATASET || 'aarez-mgnmt-logs';
    const token = process.env.VITE_AXIOM_TOKEN;
    const orgId = process.env.VITE_AXIOM_ORG_ID;
    if (!token || !orgId) {
      throw new Error("Axiom environment variables VITE_AXIOM_TOKEN and VITE_AXIOM_ORG_ID must be set.");
    }
    this.axiom = new Axiom({
      token: token,
      orgId: orgId,
    });
  }

  private formatLogEntry(level: string, message: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      ...context,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  private sendToAxiom(logEntry: LogEntry) {
    this.axiom.ingest(this.dataset, [logEntry]);
  }

  info(message: string, context?: Record<string, any>) {
    const logEntry = this.formatLogEntry('info', message, context);
    console.log(`[INFO] ${message}`, context);
    this.sendToAxiom(logEntry);
  }

  error(message: string, context?: Record<string, any>) {
    const logEntry = this.formatLogEntry('error', message, context);
    console.error(`[ERROR] ${message}`, context);
    this.sendToAxiom(logEntry);
  }

  debug(message: string, context?: Record<string, any>) {
    const logEntry = this.formatLogEntry('debug', message, context);
    console.debug(`[DEBUG] ${message}`, context);
    this.sendToAxiom(logEntry);
  }

  trackUserActivity(userId: string, action: string, details?: Record<string, any>) {
    this.info(`User ${action}`, {
      userId,
      ...details
    });
  }
}

export const axiomLogger = new AxiomLogger();
