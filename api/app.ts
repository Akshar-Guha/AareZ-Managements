import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import promBundle from 'express-prom-bundle';
import * as promClient from 'prom-client';

// Create a new registry for custom metrics
const register = new promClient.Registry();

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

    // Prometheus middleware for default metrics
    app.use(promBundle({
      includeMethod: true,
      includePath: true,
      promClient: promClient,
      metricsPath: '/metrics',
      promRegistry: register
    }));

    // Middleware to track active requests
    app.use((req, res, next) => {
      activeRequests.inc();
      const end = httpRequestDurationMicroseconds.startTimer();
      
      res.on('finish', () => {
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
      res.json({ 
        ok: true, 
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
        activeRequests: activeRequests.get(),
        totalRequests: totalRequests.get()
      });
    });

    console.log('All routes configured successfully');
    return app;
  } catch (error) {
    console.error('CRITICAL: Error in createApp():', error);
    throw error;
  }
}
