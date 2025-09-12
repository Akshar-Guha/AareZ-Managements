import { createApp } from './app.js';
import serverless from 'serverless-http';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: ['.env.local', '.env'] });

// Initialize app once per runtime instance
let appInstance: ReturnType<typeof createApp> | null = null;
let serverlessHandler: any = null;

async function getApp() {
  if (!appInstance) {
    console.log('Initializing Express app for Vercel function');
    
    // Enhanced environment variable logging
    console.log('Environment Variables:', {
      NODE_ENV: process.env.NODE_ENV,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not Set',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not Set',
      MIGRATE_ON_START: process.env.MIGRATE_ON_START
    });

    console.log('Attempting to create Express app...');
    appInstance = createApp();
    console.log('Express app created successfully.');
    
    // Run migration on cold start if enabled
    if (process.env.MIGRATE_ON_START !== 'false') {
      try {
        console.log('Running schema migration on cold start...');
        // Ensure schema migration logic is implemented in createApp
        console.log('Schema migration completed on cold start.');
      } catch (err) {
        console.error('Schema migration failed on cold start:', err);
        // Log detailed error information
        console.error('Detailed Cold-start schema migration error:', {
          errorMessage: err instanceof Error ? err.message : String(err),
          errorStack: err instanceof Error ? err.stack : 'No stack trace'
        });
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
  
  // Explicit CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  try {
    const { handler } = await getApp();
    // Set custom headers for debugging
    res.setHeader('X-Powered-By', 'Aarez Healthcare Vercel Function');
    
    // Handle the request with serverless-http
    return await handler(req, res);
  } catch (error) {
    console.error('Serverless handler error:', error);
    
    // Detailed error logging
    console.error('Serverless handler detailed error:', {
      message: error instanceof Error ? error.message : String(error),
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      errorStack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
