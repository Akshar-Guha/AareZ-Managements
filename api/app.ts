import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import promBundle from 'express-prom-bundle';
import * as promClient from 'prom-client';
import { Axiom } from '@axiomhq/js';
import { stackServerApp } from './stack';

// Initialize Axiom client only if credentials are provided
const axiomToken = process.env.AXIOM_TOKEN;
const axiomOrgId = process.env.AXIOM_ORG_ID;

// Create the client only when both token and orgId are available; otherwise stub out ingest
const axiomClient = axiomToken && axiomOrgId
  ? new Axiom({ token: axiomToken, orgId: axiomOrgId })
  : null;

/**
 * Safe wrapper around Axiom ingest that only sends data when the client is available.
 * Logs any ingestion errors to the console so they don’t crash the request lifecycle.
 */
function ingest(dataset: string, data: unknown[]): Promise<void> {
  if (!axiomClient) return Promise.resolve();
  return axiomClient.ingest(dataset, data).catch((err: any) => {
    console.error('Axiom ingest error:', err);
  });
}

// Create a new registry for custom metrics
const register = new promClient.Registry();

// Collect default metrics only once
promClient.collectDefaultMetrics({ register });

// Define custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  registers: [register]
});

const activeRequests = new promClient.Gauge({
  name: 'active_requests',
  help: 'Number of active requests currently being processed',
  registers: [register]
});

const totalRequests = new promClient.Counter({
  name: 'total_requests',
  help: 'Total number of requests processed',
  labelNames: ['method', 'route', 'code'],
  registers: [register]
});

export function createApp() {
  console.log('Starting createApp() function');
  
  // Log all environment variables for debugging
  console.log('Environment Variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not Set');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set');

  // Comprehensive error handling
  try {
    const app = express();

    // Add Stack Auth middleware
    app.use(stackServerApp.expressMiddleware);

    // Middleware to log requests with Axiom
    app.use((req, res, next) => {
      const startTime = Date.now();
      
      // Log request details to Axiom
      ingest('vercel-requests', [{
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
        headers: {
          userAgent: req.get('User-Agent'),
          host: req.get('Host')
        }
      });

      // Track active requests and timing
      activeRequests.inc();
      const end = httpRequestDurationMicroseconds.startTimer();
      
      // Capture response details
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Log response details to Axiom
        ingest('vercel-responses', [{
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: duration,
          timestamp: new Date().toISOString()
        });

        end({ 
          method: req.method, 
          route: req.path, 
          code: res.statusCode 
        });
        
        totalRequests.inc({
          method: req.method, 
          route: req.path, 
          code: res.statusCode
        });
        
        activeRequests.dec();
      });
      
      next();
    });

    // Prometheus middleware for default metrics
    app.use(promBundle({
      includeMethod: true,
      includePath: true,
      // Removed promClient: promClient as it conflicts with global collectDefaultMetrics
      metricsPath: '/metrics',
      promRegistry: register
    }));

    // Detailed CORS configuration
    console.log('Configuring CORS middleware...');
    const corsOptions = {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };
    app.use(cors(corsOptions));
    console.log('CORS middleware configured with options:', corsOptions);

    // JSON parsing middleware
    console.log('Configuring JSON middleware...');
    app.use(express.json({
      limit: '10mb', // Increase payload size limit if needed
      strict: true
    }));
    console.log('JSON middleware configured');

    // Cookie parser middleware
    console.log('Configuring cookie-parser middleware...');
    const cookieSecret = process.env.JWT_SECRET || 'dev-secret-change-me';
    app.use(cookieParser(cookieSecret));
    console.log('Cookie-parser middleware configured');

    // Diagnostic routes
    console.log('Adding diagnostic routes...');
    
    // Prometheus metrics endpoint
    app.get('/metrics', async (req, res) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    });

    // Axiom diagnostic route
    app.get('/api/diagnostics', async (req, res) => {
      try {
        const diagnostics = {
          activeRequests: activeRequests.get(),
          totalRequests: totalRequests.get(),
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV
        };
        
        // Log diagnostics to Axiom
        ingest('vercel-diagnostics', [diagnostics]);
        
        res.json(diagnostics);
      } catch (error) {
        console.error('Diagnostics error:', error);
        res.status(500).json({ error: 'Failed to retrieve diagnostics' });
      }
    });

    // Environment info route
    app.get('/api/env', (req, res) => {
      res.json({
        nodeEnv: process.env.NODE_ENV,
        corsOrigin: process.env.CORS_ORIGIN,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      });
    });

    // Health check route with comprehensive info
    app.get('/api/health', (req, res) => {
      console.log('Health endpoint hit');
      const healthInfo = { 
        ok: true, 
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
        activeRequests: activeRequests.get(),
        totalRequests: totalRequests.get()
      };
      
      // Log health check to Axiom
      ingest('vercel-health-checks', [healthInfo]);
      
      res.json(healthInfo);
    });

    console.log('All routes configured successfully');
    return app;
  } catch (error) {
    console.error('CRITICAL: Error in createApp():', error);
    
    // Log critical error to Axiom
    ingest('vercel-errors', [{
      type: 'createApp',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }]);
    
    throw error;
  }
}
