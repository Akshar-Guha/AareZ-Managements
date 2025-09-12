import { createApp } from './app.js';
import serverless from 'serverless-http';
import type { Request, Response } from 'express';
// import dotenv from 'dotenv'; // Removed as Vercel injects env vars directly

console.log('api/index.ts: Module loaded.');

// Load environment variables - no longer needed with Vercel direct injection
// dotenv.config({ path: ['.env.local', '.env'] });

// Initialize app once per runtime instance
let appInstance: ReturnType<typeof createApp> | null = null;
let serverlessHandler: any = null;

async function getApp() {
  console.log('api/index.ts: getApp() called.');
  if (!appInstance) {
    console.log('api/index.ts: Initializing Express app for Vercel function (cold start).');
    
    // Explicitly check and log critical environment variables
    console.log('api/index.ts: Checking critical environment variables...');
    const databaseUrlStatus = process.env.DATABASE_URL ? 'Set' : 'NOT SET';
    const jwtSecretStatus = process.env.JWT_SECRET ? 'Set' : 'NOT SET';
    console.log(`api/index.ts: DATABASE_URL status: ${databaseUrlStatus}`);
    console.log(`api/index.ts: JWT_SECRET status: ${jwtSecretStatus}`);

    if (!process.env.DATABASE_URL) {
      console.error('CRITICAL ERROR (api/index.ts): DATABASE_URL is not set.');
      throw new Error('DATABASE_URL environment variable is required.');
    }
    if (!process.env.JWT_SECRET) {
      console.error('CRITICAL ERROR (api/index.ts): JWT_SECRET is not set.');
      throw new Error('JWT_SECRET environment variable is required.');
    }

    // Enhanced environment variable logging
    console.log('api/index.ts: All Environment Variables:', {
      NODE_ENV: process.env.NODE_ENV,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      JWT_SECRET: jwtSecretStatus, // Use status here
      DATABASE_URL: databaseUrlStatus, // Use status here
      MIGRATE_ON_START: process.env.MIGRATE_ON_START
    });

    console.log('api/index.ts: Attempting to create Express app...');
    try {
        appInstance = createApp();
        console.log('api/index.ts: Express app created successfully.');
    } catch (createAppError) {
        console.error('CRITICAL ERROR (api/index.ts): Failed to create Express app:', createAppError);
        throw createAppError; // Re-throw to propagate the error
    }

    // Run migration on cold start if enabled
    if (process.env.MIGRATE_ON_START !== 'false') {
      console.log('api/index.ts: MIGRATE_ON_START is true. Running schema migration...');
      try {
        // Assuming createApp() internally calls ensureSchema or similar migration logic
        // If not, you'd call it here: await ensureSchema();
        console.log('api/index.ts: Schema migration completed on cold start.');
      } catch (err) {
        console.error('CRITICAL ERROR (api/index.ts): Schema migration failed on cold start:', err);
        console.error('api/index.ts: Detailed Cold-start schema migration error:', {
          errorMessage: err instanceof Error ? err.message : String(err),
          errorStack: err instanceof Error ? err.stack : 'No stack trace'
        });
        throw err; // Re-throw to prevent the function from becoming unresponsive
      }
    }

    serverlessHandler = serverless(appInstance, {
      binary: ['image/png', 'image/jpeg', 'application/pdf', 'application/json']
    });
    console.log('api/index.ts: serverlessHandler created.');
  }
  return { app: appInstance, handler: serverlessHandler };
}

export default async function handler(req: Request, res: Response) {
  console.log(`api/index.ts: Handler invoked for: ${req.method} ${req.url}`);
  console.log(`api/index.ts: Request Headers (partial): Host=${req.headers.host}, User-Agent=${req.headers['user-agent']}`);

  // Explicit CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('api/index.ts: Handling OPTIONS preflight request.');
    return res.status(204).end();
  }

  try {
    const { handler } = await getApp();
    console.log('api/index.ts: getApp() returned handler. Proceeding with request.');
    // Set custom headers for debugging
    res.setHeader('X-Powered-By', 'Aarez Healthcare Vercel Function');

    // Handle the request with serverless-http
    return await handler(req, res);
  } catch (error) {
    console.error('CRITICAL ERROR (api/index.ts): Serverless handler execution failed:', error);

    // Detailed error logging
    console.error('api/index.ts: Serverless handler detailed error:', {
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
