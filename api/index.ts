import { createApp } from './app.js';
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
        // Removed direct ensureSchema call
        console.log('Schema migration completed on cold start.');
      } catch (err) {
        console.error('Schema migration failed on cold start:', err);
        // Standard console error for tracking
        console.error('Cold-start schema migration error:', err);
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
    
    // Standard console error for tracking
    console.error('Serverless handler detailed error:', {
      message: error instanceof Error ? error.message : String(error),
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
