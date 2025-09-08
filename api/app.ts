import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// import { Pool } from 'pg'; // Remove pg import

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
        environment: process.env.NODE_ENV
      });
    });

    console.log('All routes configured successfully');
    return app;
  } catch (error) {
    console.error('CRITICAL: Error in createApp():', error);
    throw error;
  }
}
