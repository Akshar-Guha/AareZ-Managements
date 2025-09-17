import express from 'express';
import serverless from 'serverless-http';

// IMMEDIATE LOGGING - This should appear in Vercel logs
console.log('🚀 api/index.ts: MODULE LOADED - Function starting up');
console.log('📊 Environment check at module load:', {
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
  NODE_ENV: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
});

// Create a simple Express app inline to avoid import issues
function createSimpleApp() {
  console.log('api/index.ts: Creating simple Express app...');

  const app = express();

  // Basic middleware
  app.use(express.json());

  // CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Root route
  app.get('/', (req, res) => {
    console.log('api/index.ts: Root route hit!');
    res.json({
      message: 'Welcome to Aarez Healthcare Backend API',
      status: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET
      },
      availableEndpoints: [
        '/api/health',
        '/api/ping',
        '/api/env-test',
        '/api/diagnostic'
      ]
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });

  // Ping endpoint
  app.get('/api/ping', (req, res) => {
    res.json({
      status: 'OK',
      message: 'Vercel function is working',
      timestamp: new Date().toISOString()
    });
  });

  // Environment test
  app.get('/api/env-test', (req, res) => {
    res.json({
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
        CORS_ORIGIN: process.env.CORS_ORIGIN
      }
    });
  });

  // Catch-all for unmatched routes
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      availableEndpoints: [
        '/',
        '/api/health',
        '/api/ping',
        '/api/env-test'
      ]
    });
  });

  console.log('api/index.ts: Simple Express app created successfully.');
  return app;
}

// Initialize app once per runtime instance
let serverlessHandler: any = null;

async function getHandler() {
  if (!serverlessHandler) {
    console.log('api/index.ts: Creating serverless handler...');
    const app = createSimpleApp();
    serverlessHandler = serverless(app, {
      binary: ['image/png', 'image/jpeg', 'application/pdf', 'application/json']
    });
    console.log('api/index.ts: Serverless handler created.');
  }
  return serverlessHandler;
}

export default async function handler(req: any, res: any) {
  console.log(`🚀 API Request: ${req.method} ${req.url}`);

  try {
    const serverlessHandler = await getHandler();
    return await serverlessHandler(req, res);
  } catch (error) {
    console.error('CRITICAL ERROR: Handler execution failed:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
