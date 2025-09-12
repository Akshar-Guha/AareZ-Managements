// Lightweight console proxy that forwards browser console logs to the server
// while preserving original console behavior. This helps Vercel capture
// client-side events in Runtime Logs via our /api/logs endpoint.

// Only activate in the browser
if (typeof window !== 'undefined') {
  (window as any).__CONSOLE_BRIDGE_ACTIVE__ = true;
  const original = {
    log: console.log.bind(console),
    info: console.info ? console.info.bind(console) : console.log.bind(console),
    warn: console.warn ? console.warn.bind(console) : console.log.bind(console),
    error: console.error ? console.error.bind(console) : console.log.bind(console),
    debug: console.debug ? console.debug.bind(console) : console.log.bind(console),
  } as const;

  // Resolve API base URL similar to src/lib/api.ts logic
  const resolveApiBase = () => {
    const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
    const host = window.location.hostname;
    const origin = window.location.origin;
    const isLocalhost = host === 'localhost' || /^localhost:\\d+$/.test(host) || host.endsWith('.local');
    // Prefer same-origin on non-localhost (Vercel prod/preview)
    if (!isLocalhost) return origin;
    // For localhost only, allow explicit env override or fallback to 3100
    if (envBase) return envBase;
    return 'http://localhost:3100';
  };

  const postLog = (level: 'INFO'|'WARN'|'ERROR'|'DEBUG', message: string, extra?: any) => {
    try {
      fetch(`${resolveApiBase()}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          level,
          message,
          context: extra,
          timestamp: new Date().toISOString(),
          source: 'browser-console',
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      }).catch(() => {});
    } catch { /* no-op */ }
  };

  const safeStringify = (args: any[]): string => {
    try {
      return args.map(a => {
        if (typeof a === 'string') return a;
        return JSON.stringify(a);
      }).join(' ');
    } catch {
      return args.map(String).join(' ');
    }
  };

  console.log = (...args: any[]) => {
    original.log(...args);
    postLog('INFO', safeStringify(args));
  };
  console.info = (...args: any[]) => {
    original.info(...args);
    postLog('INFO', safeStringify(args));
  };
  console.warn = (...args: any[]) => {
    original.warn(...args);
    postLog('WARN', safeStringify(args));
  };
  console.error = (...args: any[]) => {
    original.error(...args);
    postLog('ERROR', safeStringify(args));
  };
  console.debug = (...args: any[]) => {
    original.debug(...args);
    postLog('DEBUG', safeStringify(args));
  };
}
