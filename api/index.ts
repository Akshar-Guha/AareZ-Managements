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
console.log('🔧 All environment variables:', Object.keys(process.env));
console.log('🌐 Current working directory:', process.cwd());
console.log('📁 Files in current directory:', require('fs').readdirSync('.'));

// Create a simple Express app inline to avoid import issues
function createSimpleApp() {
  console.log('api/index.ts: Creating simple Express app...');

  const app = express();

  // Basic middleware
  app.use(express.json());

  // CORS headers - Allow all for debugging
  app.use((req, res, next) => {
    console.log('CORS Request from:', req.headers.origin, 'Method:', req.method);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cookie,X-Requested-With,Cache-Control');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS preflight request');
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
    console.log('HEALTH CHECK REQUEST:', {
      method: req.method,
      url: req.url,
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage()
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

  // Auth endpoints
  app.post('/api/auth/login', express.json(), async (req, res) => {
    try {
      console.log('Login request received:', {
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
        body: req.body
      });

      const { email, password } = req.body;
      console.log('Login attempt:', { email, hasPassword: !!password });

      // Mock authentication for now - replace with real database lookup
      if (email === 'admin@aarezhealth.com' && password === 'admin123') {
        const user = {
          id: 1,
          name: 'Admin User',
          email: 'admin@aarezhealth.com',
          role: 'admin'
        };

        // Set cookie for session
        res.cookie('token', 'mock-jwt-token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        console.log('Login successful, sending user data');
        res.json(user);
      } else {
        console.log('Invalid credentials for:', email);
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    console.log('/auth/me request received:', {
      method: req.method,
      url: req.url,
      origin: req.headers.origin,
      cookies: req.cookies,
      headers: req.headers
    });

    // Check for auth token
    const token = req.cookies.token;
    console.log('Auth token present:', !!token);

    if (!token) {
      console.log('No auth token found, returning 401');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Mock user for now - replace with real token verification
    const user = {
      id: 1,
      name: 'Admin User',
      email: 'admin@aarezhealth.com',
      role: 'admin'
    };

    console.log('Returning user data for /auth/me');
    res.json(user);
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  // Dashboard endpoints
  app.get('/api/dashboard/stats', (req, res) => {
    // Mock dashboard stats
    res.json({
      totalInvestments: 150,
      activeDoctors: 25,
      products: 45,
      roi: 12.5
    });
  });

  // Doctors endpoints
  app.get('/api/doctors', (req, res) => {
    // Mock doctors data
    const doctors = [
      { id: 1, code: 'DOC001', name: 'Dr. Smith', specialty: 'Cardiology' },
      { id: 2, code: 'DOC002', name: 'Dr. Johnson', specialty: 'Neurology' }
    ];
    res.json(doctors);
  });

  // Products endpoints
  app.get('/api/products', (req, res) => {
    // Mock products data
    const products = [
      { id: 1, name: 'Product A', category: 'Medicine', status: 'Active', price: 25.50 },
      { id: 2, name: 'Product B', category: 'Equipment', status: 'Active', price: 150.00 }
    ];
    res.json(products);
  });

  // Investments endpoints
  app.get('/api/investments', (req, res) => {
    // Mock investments data
    const investments = [
      { id: 1, doctor_code: 'DOC001', amount: 5000, investment_date: '2024-01-15', expected_returns: 600 },
      { id: 2, doctor_code: 'DOC002', amount: 7500, investment_date: '2024-02-20', expected_returns: 900 }
    ];
    res.json(investments);
  });

  // Logging endpoint to handle frontend logs
  app.post('/api/logs', express.json(), (req, res) => {
    console.log('Frontend log received:', req.body);
    res.status(204).end(); // No content response
  });

  // Test endpoint for debugging
  app.get('/api/test', (req, res) => {
    console.log('TEST ENDPOINT HIT:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
    res.json({
      message: 'Backend is working!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      requestInfo: {
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
        userAgent: req.headers['user-agent']
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
