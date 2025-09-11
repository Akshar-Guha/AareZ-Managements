import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import promBundle from 'express-prom-bundle';
import * as promClient from 'prom-client';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import Logger from '../src/lib/logger';

// Type assertion and helper functions
function assertResult<T>(result: unknown): T {
  return result as T;
}

function safeParseInt(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

// Modify the ingest function to use Logger
function ingest(dataset: string, data: unknown[]): void {
  // Always log to console for local debugging
  Logger.info(`Logging to dataset: ${dataset}`, { data });
}

// Modify logUserActivity to use Logger
async function logUserActivity(
  userId: number | null, 
  action: string, 
  entityType: string, 
  entityId: number | null = null, 
  details: Record<string, any> = {}
): Promise<void> {
  try {
    // Log to console for immediate visibility
    Logger.info('User Activity', { 
      userId, 
      action, 
      entityType, 
      entityId, 
      details 
    });

    // Optionally log to database activity_logs table
    if (userId) {
      await getPool().query(
        'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [userId, action, entityType, entityId, JSON.stringify(details)]
      );
    }
  } catch (error) {
    Logger.error('Failed to log user activity', { error });
  }
}

// Modify logEnhancedError to use Logger
function logEnhancedError(
  error: Error, 
  context: { 
    route?: string, 
    method?: string, 
    input?: any 
  } = {}, 
  userId: number | null = null
): void {
  const errorLog = {
    message: error.message,
    name: error.name || 'UnknownError',
    stack: error.stack,
    context,
    userId,
    timestamp: new Date().toISOString()
  };

  // Log to console for immediate visibility
  Logger.error('Enhanced Error Log', errorLog);
}

// Modify logPerformanceMetric to use Logger
function logPerformanceMetric(metricName: string, duration: number, additionalContext: Record<string, any> = {}) {
  const performanceLog = {
    metricName,
    duration,
    timestamp: new Date().toISOString(),
    ...additionalContext
  };

  // Log to console for local debugging
  Logger.debug('Performance Metric', performanceLog);
}

// Modify trackQueryPerformance to use new logging
function trackQueryPerformance<T>(
  queryName: string, 
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  return queryFn()
    .then((result) => {
      const duration = Date.now() - startTime;
      
      // Enhanced performance logging
      logPerformanceMetric('database-query', duration, {
        queryName,
        status: 'success',
        rowCount: Array.isArray(result) ? result.length : 'N/A'
      });

      return result;
    })
    .catch((error: unknown) => {
      const duration = Date.now() - startTime;
      
      // Log performance for failed queries with error details
      logPerformanceMetric('database-query', duration, {
        queryName,
        status: 'error',
        errorMessage: String(error)
      });

      throw error;
    });
}

// Database setup: Create a singleton pool
let pool: Pool | null = null;
const DATABASE_URL = process.env.DATABASE_URL;

function getPool() {
  if (!DATABASE_URL) {
    console.warn('DATABASE_URL not set. API will error until it is configured.');
    throw new Error('DATABASE_URL is required');
  }
  if (!pool) {
    console.log('Creating new PostgreSQL connection pool...');
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 20, // Max number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    pool.on('error', (err: Error) => {
      Logger.error('Unexpected error on idle client', { error: err });
    });
  }
  return pool;
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

// Global error and unhandled rejection handlers
process.on('uncaughtException', (error: Error) => {
  Logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack
  });
  // Optionally exit the process in a production environment
  // process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  Logger.error('Unhandled Rejection', {
    reason: String(reason),
    promise: String(promise)
  });
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

    // Middleware to log requests
    app.use((req, res, next) => {
      const startTime = Date.now();
      
      // Log request details to console
      Logger.info(`Request: ${req.method} ${req.path}`, {
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
        
        // Log response details to console
        Logger.info(`Response: ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`, {
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
      metricsPath: '/metrics',
      promRegistry: register
    }));

    // Detailed CORS configuration for production and development
    console.log('Configuring CORS middleware...');
    
    // Get origin from env or use a set of allowed origins
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:5173',
      'https://aarez-mgnmt.vercel.app',
      /\.vercel\.app$/
    ];
    
    const corsOptions = {
      origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) {
          Logger.info('Allowing request with no origin');
          return callback(null, true);
        }
        
        // Check if the origin is allowed
        const allowed = allowedOrigins.some(allowedOrigin => {
          if (typeof allowedOrigin === 'string') {
            return allowedOrigin === origin;
          } else if (allowedOrigin instanceof RegExp) {
            return allowedOrigin.test(origin);
          }
          return false;
        });
        
        if (allowed) {
          Logger.info(`Allowing request from origin: ${origin}`);
          return callback(null, true);
        } else {
          Logger.warn(`Blocking request from origin: ${origin}`);
          return callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 86400 // 24 hours in seconds
    };
    
    app.use(cors(corsOptions));
    console.log('CORS middleware configured for Vercel deployment');

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

    // Database setup - Removed direct pool creation
    // Moved to getPool() function

    // Schema management
    async function ensureSchema() { // Export ensureSchema
      console.log('Ensuring database schema is up-to-date...');
      const currentPool = getPool(); // Use the singleton pool
      try {
        // Users table
        await currentPool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'mr',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        // Doctors table
        await currentPool.query(`
          CREATE TABLE IF NOT EXISTS doctors (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            specialty TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        // Products table
        await currentPool.query(`
          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Active',
            price NUMERIC(12,2) DEFAULT 0,
            product_type TEXT,
            packaging_type TEXT,
            strips_per_box INTEGER,
            units_per_strip INTEGER,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        // Investments table
        await currentPool.query(`
          CREATE TABLE IF NOT EXISTS investments (
            id SERIAL PRIMARY KEY,
            doctor_id INTEGER REFERENCES doctors(id),
            doctor_code TEXT,
            doctor_name TEXT,
            amount NUMERIC(12,2) NOT NULL,
            investment_date DATE NOT NULL,
            expected_returns NUMERIC(12,2),
            actual_returns NUMERIC(12,2),
            preferences TEXT[],
            notes TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        // Bills table
        await currentPool.query(`
          CREATE TABLE IF NOT EXISTS bills (
            id SERIAL PRIMARY KEY,
            merchant TEXT,
            bill_date DATE,
            total NUMERIC(12,2),
            items JSONB,
            raw_text TEXT,
            extracted JSONB,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        // Pharmacies table
        await currentPool.query(`
          CREATE TABLE IF NOT EXISTS pharmacies (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            city TEXT NOT NULL,
            address TEXT NOT NULL,
            product_with_count_given JSONB DEFAULT '[]',
            date_given DATE NOT NULL,
            current_stock_owns JSONB DEFAULT '[]',
            due_date_amount DATE NOT NULL,
            scheme_applied TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        // Activity logs table
        await currentPool.query(`
          CREATE TABLE IF NOT EXISTS activity_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id INTEGER,
            details JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        // Insert default users if they don't exist
        const adminExistsRes = await currentPool.query('SELECT 1 FROM users WHERE email = $1', ['admin@aarezhealth.com']);
        if (adminExistsRes.rowCount === 0) {
          console.log('Creating default admin user via ensureSchema...');
          const password_hash = await bcrypt.hash('admin123', 10);
          await currentPool.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)', ['Umbra', 'admin@aarezhealth.com', password_hash, 'admin']);
          console.log('Default admin user created: admin@aarezhealth.com / admin123');
        }

        const extraUsers = [
          { name: 'User One', email: 'user1@aarezhealth.com', password: 'user123', role: 'user' },
          { name: 'User Two', email: 'user2@aarezhealth.com', password: 'user123', role: 'user' },
          { name: 'User Three', email: 'user3@aarezhealth.com', password: 'user123', role: 'user' }
        ];

        for (const u of extraUsers) {
          const userExistsRes = await currentPool.query('SELECT 1 FROM users WHERE email = $1', [u.email]);
          if (userExistsRes.rowCount === 0) {
            const password_hash = await bcrypt.hash(u.password, 10);
            await currentPool.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)', [u.name, u.email, password_hash, u.role]);
            console.log(`Default user created via ensureSchema: ${u.email} / ${u.password}`);
          }
        }

        const mrExistsRes = await currentPool.query('SELECT 1 FROM users WHERE email = $1', ['mr@aarezhealth.com']);
        if (mrExistsRes.rowCount === 0) {
          console.log('Creating default MR user via ensureSchema...');
          const password_hash = await bcrypt.hash('mr123', 10);
          await currentPool.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)', ['MR User', 'mr@aarezhealth.com', password_hash, 'mr']);
          console.log('Default MR user created: mr@aarezhealth.com / mr123');
        }
      } catch (err: unknown) { // Explicitly type err as unknown
        Logger.error('Schema creation error in ensureSchema', { error: String(err) });
      }
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

    // Auth functions
    function signToken(payload: any) {
      return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    }

    function setAuthCookie(res: any, token: string) {
      const isProd = process.env.NODE_ENV === 'production';
      const hostname = res.req?.headers?.host || '';
      const isVercel = hostname.includes('vercel.app');
      
      Logger.info('Setting auth cookie with details', {
        isProd,
        hostname,
        isVercel
      });
      
      // Cookie settings
      const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax', // 'none' allows cookies in cross-site requests with secure flag
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };
      
      // Set cookie and log details
      res.cookie('token', token, cookieOptions);
      Logger.info(`Auth cookie set with options: ${JSON.stringify(cookieOptions)}`);
    }

    function requireAuth(req: any, res: any, next: any) {
      const token = req.cookies.token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
      } catch (e: unknown) {
        Logger.error('Authentication failed', { error: String(e) });
        res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // Diagnostic routes
    console.log('Adding diagnostic routes...');
    
    // Prometheus metrics endpoint
    app.get('/metrics', async (req, res) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    });

    // Diagnostic route
    app.get('/api/diagnostics', async (req, res) => {
      try {
        const diagnostics = {
          activeRequests: activeRequests.get(),
          totalRequests: totalRequests.get(),
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV
        };
        
        // Log diagnostics to console
        Logger.info('Vercel Diagnostics', diagnostics);
        
        res.json(diagnostics);
      } catch (error: unknown) {
        Logger.error('Diagnostics error', { error: String(error) });
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
    app.get('/api/health', async (req, res) => {
      Logger.info('Health endpoint hit');
      try {
        const currentPool = getPool(); // Use the singleton pool
        // Test DB connection for health
        await currentPool.query('SELECT 1');
        const healthInfo = {
          ok: true,
          timestamp: new Date().toISOString(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV,
          activeRequests: activeRequests.get(),
          totalRequests: totalRequests.get(),
          dbConnected: true
        };
        
        // Log health check to console
        Logger.info('Vercel Health Check', healthInfo);
        
        res.json(healthInfo);
      } catch (err: unknown) {
        Logger.error('Health check DB error', { error: String(err) });
        res.status(500).json({ ok: false, error: 'DB connection failed' });
      }
    });

    // Add new migration endpoint
    app.get('/api/migrate', async (req, res) => {
      Logger.info('Migration endpoint hit');
      try {
        await ensureSchema();
        res.json({ success: true, message: 'Schema migrated successfully' });
      } catch (error: unknown) {
        Logger.error('Migration failed', { error: String(error) });
        res.status(500).json({ success: false, error: String(error) });
      }
    });

    // Business routes
    console.log('Adding business routes...');

    // Auth routes
    app.post('/api/auth/register', async (req, res) => {
      try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
        const password_hash = await bcrypt.hash(password, 10);
        const result = await getPool().query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role', [name, email, password_hash, 'user']);
        const user = assertResult<any>(result.rows[0]); // Use assertResult here
        setAuthCookie(res, signToken({ id: user.id, email: user.email, role: user.role }));
        res.json(user);
      } catch (e: unknown) {
        if (String(e).includes('duplicate key')) return res.status(409).json({ error: 'Email exists' });
        Logger.error('Register error', { error: String(e) });
        res.status(500).json({ error: 'Registration failed' });
      }
    });

    app.post('/api/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        
        // Log incoming login attempt
        Logger.info('Login attempt', { email });
        
        // Detailed database query logging
        try {
          const result = await trackQueryPerformance('login_query', () => 
            getPool().query('SELECT id, name, email, role, password_hash FROM users WHERE email = $1 LIMIT 1', [email])
          );
          
          const user = assertResult<any>(result.rows[0]); // Use assertResult here
          
          // Log user lookup result
          Logger.info('User lookup result', { 
            userFound: !!user, 
            email 
          });
          
          if (!user) {
            // Log failed login attempt
            logEnhancedError(new Error('User not found'), {
              route: '/api/auth/login',
              method: 'POST',
              input: { email }
            });
            
            return res.status(401).json({ error: 'Invalid credentials' });
          }
          
          const ok = await bcrypt.compare(password, user.password_hash);
          
          // Log password comparison result
          Logger.info('Password comparison result', { 
            passwordMatch: ok, 
            email 
          });
          
          if (!ok) {
            // Log failed password attempt
            logEnhancedError(new Error('Invalid password'), {
              route: '/api/auth/login',
              method: 'POST',
              input: { email }
            });
            
            return res.status(401).json({ error: 'Invalid credentials' });
          }
          
          // Successful login
          setAuthCookie(res, signToken({ id: user.id, email: user.email, role: user.role }));
          
          // Log successful login
          logUserActivity(
            user.id, 
            'login', 
            'user', 
            user.id, 
            { email }
          );
          
          const { password_hash, ...safe } = user;
          res.json(safe);
        } catch (queryError: unknown) { // Explicitly type queryError as unknown
          // Log database query error
          Logger.error('Login database query error', { error: String(queryError) });
          
          logEnhancedError(new Error(String(queryError)), {
            route: '/api/auth/login',
            method: 'POST',
            input: { email }
          });
          
          res.status(500).json({ error: 'Database error during login' });
        }
      } catch (e: unknown) { // Explicitly type e as unknown
        // Catch-all error logging
        Logger.error('Unexpected login error', { error: String(e) });
        
        logEnhancedError(new Error(String(e)), {
          route: '/api/auth/login',
          method: 'POST',
          input: { email: req.body.email }
        });
        
        res.status(500).json({ error: 'Unexpected error during login' });
      }
    });

    app.get('/api/auth/me', requireAuth, async (req: any, res) => {
      try {
        const { id } = req.user;
        const result = await getPool().query('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
        res.json(result.rows[0] || null);
      } catch (e: unknown) {
        Logger.error('Me error', { error: String(e) });
        res.status(500).json({ error: 'Failed to fetch user' });
      }
    });

    app.post('/api/auth/logout', (req, res) => {
      res.cookie('token', '', { httpOnly: true, maxAge: 0, path: '/' });
      res.json({ ok: true });
    });

    // Doctors routes
    app.get('/api/doctors', requireAuth, async (req: any, res) => {
      try {
        const result = await getPool().query('SELECT * FROM doctors ORDER BY created_at DESC LIMIT 100');
        res.json(result.rows);
      } catch (e: unknown) {
        Logger.error('Doctors get error', { error: String(e) });
        res.status(500).json({ error: 'Failed to fetch doctors' });
      }
    });

    app.post('/api/doctors', requireAuth, async (req: any, res) => {
      try {
        const { code = '', name = '', specialty = '' } = req.body;
        const result = await trackQueryPerformance('create_doctor', () => 
          getPool().query('INSERT INTO doctors (code, name, specialty) VALUES ($1, $2, $3) RETURNING *', [code, name, specialty])
        );
        
        // Log user activity for doctor creation
        await logUserActivity(
          req.user.id, 
          'create', 
          'doctor', 
          assertResult<any>(result.rows[0]).id, // Use assertResult here
          { code, name, specialty }
        );
        
        res.json(assertResult<any>(result.rows[0])); // Use assertResult here
      } catch (e: unknown) {
        // Use enhanced error logging
        const code = req.body.code || '';
        const name = req.body.name || '';
        const specialty = req.body.specialty || '';
        
        logEnhancedError(new Error(String(e)), {
          route: '/api/doctors',
          method: 'POST',
          input: { code, name, specialty }
        }, req.user?.id);
        
        if (String(e).includes('duplicate key')) {
          return res.status(409).json({ error: 'Doctor code exists' });
        }
        
        res.status(500).json({ error: 'Failed to create doctor' });
      }
    });

    // Products routes
    app.get('/api/products', requireAuth, async (req: any, res) => {
      try {
        const result = await getPool().query('SELECT * FROM products ORDER BY created_at DESC LIMIT 200');
        res.json(result.rows);
      } catch (e: unknown) {
        Logger.error('Products get error', { error: String(e) });
        res.status(500).json({ error: 'Failed to fetch products' });
      }
    });

    app.post('/api/products', requireAuth, async (req: any, res) => {
      try {
        const { name, category, status, price, product_type, packaging_type, strips_per_box, units_per_strip } = req.body;
        const result = await getPool().query('INSERT INTO products (name, category, status, price, product_type, packaging_type, strips_per_box, units_per_strip) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [name, category, status || 'Active', price || 0, product_type || null, packaging_type || null, strips_per_box || null, units_per_strip || null]);
        res.json(assertResult<any>(result.rows[0])); // Use assertResult here
      } catch (e: unknown) {
        Logger.error('Products post error', { error: String(e) });
        res.status(500).json({ error: 'Failed to create product' });
      }
    });

    // Investments routes
    app.get('/api/investments', requireAuth, async (req: any, res) => {
      try {
        const result = await getPool().query('SELECT * FROM investments ORDER BY created_at DESC LIMIT 200');
        res.json(result.rows);
      } catch (e: unknown) {
        Logger.error('Investments get error', { error: String(e) });
        res.status(500).json({ error: 'Failed to fetch investments' });
      }
    });

    app.post('/api/investments', requireAuth, async (req: any, res) => {
      try {
        const { doctor_id = null, doctor_code = null, doctor_name = null, amount = 0, investment_date = new Date().toISOString(), expected_returns = null, actual_returns = null, preferences = null, notes = null } = req.body;
        
        const result = await trackQueryPerformance('create_investment', () => 
          getPool().query('INSERT INTO investments (doctor_id, doctor_code, doctor_name, amount, investment_date, expected_returns, actual_returns, preferences, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [doctor_id, doctor_code, doctor_name, amount, investment_date, expected_returns, actual_returns, preferences, notes, req.user.id])
        );
        
        // Log user activity for investment creation
        await logUserActivity(
          req.user.id, 
          'create', 
          'investment', 
          assertResult<any>(result.rows[0]).id, // Use assertResult here
          { 
            amount, 
            doctor_code, 
            investment_date, 
            expected_returns 
          }
        );
        
        res.json(assertResult<any>(result.rows[0])); // Use assertResult here
      } catch (e: unknown) {
        // Use enhanced error logging
        const doctor_id = req.body.doctor_id || null;
        const doctor_code = req.body.doctor_code || null;
        const amount = req.body.amount || 0;
        const investment_date = req.body.investment_date || new Date().toISOString();
        
        logEnhancedError(new Error(String(e)), {
          route: '/api/investments',
          method: 'POST',
          input: { 
            doctor_id, 
            doctor_code, 
            amount, 
            investment_date 
          }
        }, req.user?.id);
        
        res.status(500).json({ error: 'Failed to create investment' });
      }
    });

    app.get('/api/investments/summary', requireAuth, async (req: any, res) => {
      try {
        const result = await getPool().query('SELECT COALESCE(SUM(amount),0)::numeric AS total_investments, COALESCE(SUM(expected_returns),0)::numeric AS total_expected, COALESCE(SUM(actual_returns),0)::numeric AS total_actual FROM investments');
        const r = assertResult<any>(result.rows[0]) || { total_investments: 0, total_expected: 0, total_actual: 0 }; // Use assertResult here
        res.json({ totalInvestments: Number(r.total_investments), totalExpected: Number(r.total_expected), totalActual: Number(r.total_actual) });
      } catch (e: unknown) {
        Logger.error('Investments summary error', { error: String(e) });
        res.status(500).json({ error: 'Failed to fetch summary' });
      }
    });

    app.get('/api/investments/summary-by-month', requireAuth, async (req: any, res) => {
      try {
        const result = await getPool().query('SELECT to_char(investment_date, \'YYYY-MM\') AS ym, COALESCE(SUM(amount),0)::numeric AS total_amount, COALESCE(SUM(actual_returns),0)::numeric AS total_actual FROM investments GROUP BY ym ORDER BY ym');
        const rows = result.rows;
        const labels = rows.map((r: any) => r.ym);
        const amounts = rows.map((r: any) => Number(r.total_amount));
        const actuals = rows.map((r: any) => Number(r.total_actual));
        res.json({ labels, amounts, actuals });
      } catch (e: unknown) {
        Logger.error('Investments monthly summary error', { error: String(e) });
        res.status(500).json({ error: 'Failed to fetch monthly summary' });
      }
    });

    app.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
      try {
        const investmentResult = await getPool().query('SELECT COUNT(*)::int as count FROM investments');
        const doctorResult = await getPool().query('SELECT COUNT(DISTINCT doctor_code)::int as count FROM investments WHERE doctor_code IS NOT NULL');
        const productResult = await getPool().query('SELECT COUNT(*)::int as count FROM products');
        const roiResult = await getPool().query('SELECT CASE WHEN SUM(amount) > 0 THEN (SUM(COALESCE(actual_returns, 0)) / SUM(amount) * 100)::numeric ELSE 0 END as roi FROM investments');
        
        const investmentCount = assertResult<any>(investmentResult.rows[0]).count; // Use assertResult here
        const doctorCount = assertResult<any>(doctorResult.rows[0]).count; // Use assertResult here
        const productCount = assertResult<any>(productResult.rows[0]).count; // Use assertResult here
        const roiData = assertResult<any>(roiResult.rows[0]).roi; // Use assertResult here
        
        res.json({
          totalInvestments: investmentCount,
          activeDoctors: doctorCount,
          products: productCount,
          roi: Number(roiData || 0).toFixed(2)
        });
      } catch (e: unknown) {
        Logger.error('Dashboard stats error', { error: String(e) });
        res.status(500).json({ error: 'Failed to fetch stats' });
      }
    });

    app.get('/api/investments/recent', requireAuth, async (req: any, res) => {
      try {
        const result = await getPool().query('SELECT * FROM investments ORDER BY created_at DESC LIMIT 10');
        res.json(result.rows);
      } catch (e: unknown) {
        Logger.error('Recent investments error', { error: String(e) });
        res.status(500).json({ error: 'Failed to fetch recent investments' });
      }
    });

    // Bills routes
    app.get('/api/bills', requireAuth, async (req: any, res) => {
      try {
        const result = await getPool().query('SELECT * FROM bills ORDER BY created_at DESC LIMIT 100');
        res.json(result.rows);
      } catch (e: unknown) {
        Logger.error('Bills get error', { error: String(e) });
        res.status(500).json({ error: 'Failed to fetch bills' });
      }
    });

    app.post('/api/bills', requireAuth, async (req: any, res) => {
      try {
        const { merchant, bill_date, total, items, raw_text, extracted } = req.body;
        const result = await getPool().query('INSERT INTO bills (merchant, bill_date, total, items, raw_text, extracted, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [merchant || null, bill_date || null, total || 0, items || [], raw_text || null, extracted || {}, req.user.id]);
        res.json(assertResult<any>(result.rows[0])); // Use assertResult here
      } catch (e: unknown) {
        Logger.error('Bills post error', { error: String(e) });
        res.status(500).json({ error: 'Failed to create bill' });
      }
    });

    // Pharmacies routes (basic, extend as needed)
    app.get('/api/pharmacies', requireAuth, async (req: any, res) => {
      try {
        const result = await getPool().query('SELECT * FROM pharmacies ORDER BY created_at DESC LIMIT 100');
        res.json(result.rows);
      } catch (e: unknown) {
        Logger.error('Pharmacies get error', { error: String(e) });
        res.status(500).json({ error: 'Failed to fetch pharmacies' });
      }
    });

    app.post('/api/pharmacies', requireAuth, async (req: any, res) => {
      try {
        const { name, city, address, product_with_count_given, date_given, current_stock_owns, due_date_amount, scheme_applied } = req.body;
        const result = await getPool().query('INSERT INTO pharmacies (name, city, address, product_with_count_given, date_given, current_stock_owns, due_date_amount, scheme_applied, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [name, city, address, product_with_count_given || [], date_given, current_stock_owns || [], due_date_amount, scheme_applied || null, req.user.id]);
        res.json(assertResult<any>(result.rows[0])); // Use assertResult here
      } catch (e: unknown) {
        Logger.error('Pharmacies post error', { error: String(e) });
        res.status(500).json({ error: 'Failed to create pharmacy' });
      }
    });

    console.log('All routes configured successfully');
    return app;
  } catch (error: unknown) { // Explicitly type error as unknown
    Logger.error('CRITICAL: Error in createApp()', { error: String(error) });
    throw error;
  }
}
