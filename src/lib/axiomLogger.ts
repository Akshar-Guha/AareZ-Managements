 import { Axiom } from '@axiomhq/js';
 
 interface LogEntry {
   level: string;
   message: string;
   environment: string;
   [key: string]: any;
 }
 
 class AxiomLogger {
   private dataset: string;
   private axiom: Axiom | null;
 
   constructor() {
     // Prefer Vite client env at build/runtime, fallback to Node env for scripts
     const getEnvVar = (key: string): string | undefined => {
       try {
         // Vite exposes env via import.meta.env in browser/client
         const viteVal = (typeof import.meta !== 'undefined' && (import.meta as any).env)
           ? (import.meta as any).env[key]
           : undefined;
         if (viteVal !== undefined) return viteVal;
       } catch {
         // ignore
       }
       // Fallback to Node.js env (used by tsx scripts or SSR)
       // eslint-disable-next-line no-undef
       return (typeof process !== 'undefined' && process?.env) ? process.env[key] : undefined;
     };
 
     this.dataset = getEnvVar('VITE_AXIOM_DATASET') || 'aarez-mgnmt-logs';
     const token = getEnvVar('VITE_AXIOM_TOKEN');
     const orgId = getEnvVar('VITE_AXIOM_ORG_ID');
 
     if (token && orgId) {
       this.axiom = new Axiom({ token, orgId });
       console.log('[AxiomLogger] Initialized for dataset:', this.dataset);
     } else {
       this.axiom = null;
       console.warn('[AxiomLogger] Disabled: missing VITE_AXIOM_TOKEN or VITE_AXIOM_ORG_ID. Falling back to console logging only.');
     }
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
     if (!this.axiom) return;
     try {
       const maybePromise = this.axiom.ingest(this.dataset, [logEntry]);
       if (maybePromise != null && typeof (maybePromise as Promise<any>).then === 'function') {
         (maybePromise as Promise<any>).catch((err) => {
           console.error('[AxiomLogger] Ingest error:', err);
         });
       }
     } catch (err) {
       console.error('[AxiomLogger] Synchronous ingest error:', err);
     }
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
