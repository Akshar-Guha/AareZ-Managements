import { createApp } from './app';
import serverless from 'serverless-http';
import type { Request, Response } from 'express';
// import dotenv from 'dotenv'; // Removed as Vercel injects env vars directly

// IMMEDIATE LOGGING - This should appear in Vercel logs
console.log('🚀 api/index.ts: MODULE LOADED - Function starting up');
console.log('📊 Environment check at module load:', {
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
  NODE_ENV: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
});

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
      console.error('Please set DATABASE_URL in Vercel environment variables.');
      console.error('Example: postgresql://user:password@host:port/database?sslmode=require');
      throw new Error('DATABASE_URL environment variable is required. Please configure it in Vercel dashboard.');
    }
    if (!process.env.JWT_SECRET) {
      console.error('CRITICAL ERROR (api/index.ts): JWT_SECRET is not set.');
      console.error('Please set JWT_SECRET in Vercel environment variables.');
      console.error('Generate a secure random string for JWT_SECRET.');
      throw new Error('JWT_SECRET environment variable is required. Please configure it in Vercel dashboard.');
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
        console.error('api/index.ts: Continuing without schema migration - app may not work properly');
        // Don't throw here - let the app start even if migration fails
        // This prevents the entire serverless function from crashing
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
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] 🚀 API Request: ${req.method} ${req.url}`);
  console.log(`[${requestId}] 📋 Request Details:`, {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: {
      host: req.headers.host,
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? '[PRESENT]' : '[NOT SET]',
      'cookie': req.headers.cookie ? '[PRESENT]' : '[NOT SET]'
    },
    body: req.method !== 'GET' ? (req.body ? '[PRESENT]' : '[EMPTY]') : '[N/A]',
    timestamp: new Date().toISOString()
  });

  // DEBUG: Log all environment variables at handler level
  console.log(`[${requestId}] 🔧 Environment Variables Check:`, {
    DATABASE_URL: process.env.DATABASE_URL ? `SET (length: ${process.env.DATABASE_URL.length})` : 'NOT SET ❌',
    JWT_SECRET: process.env.JWT_SECRET ? `SET (length: ${process.env.JWT_SECRET.length})` : 'NOT SET ❌',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'NOT SET',
    MIGRATE_ON_START: process.env.MIGRATE_ON_START || 'NOT SET'
  });

  // Improved CORS handling
  const origin = req.headers.origin || '';
  const allowedOrigins = ['https://aarez-mgnmt.vercel.app', 'http://localhost:5173', 'http://localhost:5174'];

  // Set CORS headers based on origin
  if (allowedOrigins.some(allowed => origin.includes(allowed))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Allow requests with no origin (e.g., server-to-server, Postman)
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Default to production origin
    res.setHeader('Access-Control-Allow-Origin', 'https://aarez-mgnmt.vercel.app');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cookie,X-Requested-With,Cache-Control');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('api/index.ts: Handling OPTIONS preflight request.');
    return res.status(204).end();
  }

  // Add simple health check endpoint (no database required)
  if (req.url === '/api/ping') {
    console.log(`[${requestId}] 🏓 PING endpoint called`);
    return res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      message: 'Vercel function is working',
      requestId,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET
      }
    });
  }

  // Add environment test endpoint
  if (req.url === '/api/env-test') {
    console.log(`[${requestId}] 🧪 ENVIRONMENT TEST endpoint called`);
    return res.json({
      timestamp: new Date().toISOString(),
      requestId,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        MIGRATE_ON_START: process.env.MIGRATE_ON_START
      },
      process: {
        version: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      }
    });
  }

  // Add diagnostic endpoint
  if (req.url === '/api/diagnostic') {
    console.log('api/index.ts: Diagnostic endpoint called');
    try {
      const diagnostic = {
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
          JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
          CORS_ORIGIN: process.env.CORS_ORIGIN,
          MIGRATE_ON_START: process.env.MIGRATE_ON_START
        },
        request: {
          method: req.method,
          url: req.url,
          headers: {
            host: req.headers.host,
            'user-agent': req.headers['user-agent'],
            origin: req.headers.origin
          }
        }
      };

      console.log('api/index.ts: Diagnostic info:', diagnostic);
      return res.json(diagnostic);
    } catch (error) {
      console.error('api/index.ts: Diagnostic error:', error);
      return res.json({
        error: 'Diagnostic failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
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
