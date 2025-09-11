import { createApp, ensureSchema } from './app.js';
import serverless from 'serverless-http';
import type { Request, Response } from 'express';

// Initialize app once per runtime instance
let appInstance: ReturnType<typeof createApp> | null = null;
let serverlessHandler: any = null;

async function getApp() {
  if (!appInstance) {
    console.log('Initializing Express app for Vercel function');
    appInstance = createApp();
    
    // Run migration on cold start if enabled
    if (process.env.MIGRATE_ON_START !== 'false') {
      try {
        console.log('Running schema migration on cold start...');
        await ensureSchema();
        console.log('Schema migration completed on cold start.');
      } catch (err) {
        console.error('Schema migration failed on cold start:', err);
        // Log to Axiom for tracking
        console.log(JSON.stringify({
          type: 'cold-start-migration-error',
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString()
        }));
      }
    }
    
    serverlessHandler = serverless(appInstance, {
      binary: ['image/png', 'image/jpeg', 'application/pdf', 'application/json']
    });
  }
  return { app: appInstance, handler: serverlessHandler };
}

export default async function handler(req: Request, res: Response) {
  console.log('Serverless function invoked:', req.method, req.url);
  
  try {
    const { handler } = await getApp();
    // Set custom headers for debugging
    res.setHeader('X-Powered-By', 'Aarez Healthcare Vercel Function');
    
    // Handle the request with serverless-http
    return await handler(req, res);
  } catch (error) {
    console.error('Serverless handler error:', error);
    
    // Log detailed error
    console.log(JSON.stringify({
      type: 'serverless-handler-error',
      error: error instanceof Error ? error.message : String(error),
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    }));
    
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
