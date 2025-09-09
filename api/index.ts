import { createApp } from './app';
import serverless from 'serverless-http';
import type { Request, Response } from 'express';

// Initialize app once per runtime instance
let appInstance: ReturnType<typeof createApp> | null = null;
let serverlessHandler: any = null;

function getApp() {
  if (!appInstance) {
    console.log('Initializing Express app for Vercel function');
    appInstance = createApp();
    serverlessHandler = serverless(appInstance, {
      binary: ['image/png', 'image/jpeg', 'application/pdf', 'application/json']
    });
  }
  return { app: appInstance, handler: serverlessHandler };
}

export default async function handler(req: Request, res: Response) {
  console.log('Serverless function invoked:', req.method, req.url);
  
  try {
    const { app, handler } = getApp();
    // Set custom headers for debugging
    res.setHeader('X-Powered-By', 'Aarez Healthcare Vercel Function');
    
    // Handle the request with serverless-http
    return await handler(req, res);
  } catch (error) {
    console.error('Serverless handler error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
}
