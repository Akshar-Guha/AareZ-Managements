import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import promBundle from 'express-prom-bundle';
import * as promClient from 'prom-client';
import { Axiom } from '@axiomhq/js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

// Initialize Axiom client only if credentials are provided
const axiomToken = process.env.AXIOM_TOKEN;
const axiomOrgId = process.env.AXIOM_ORG_ID;

// Create the client only when both token and orgId are available; otherwise stub out ingest
const axiomClient = axiomToken && axiomOrgId
  ? new Axiom({ token: axiomToken, orgId: axiomOrgId })
  : null;

/**
 * Safe wrapper around Axiom ingest that only sends data when the client is available.
 * Never throws and does not rely on Promise chaining (ingest may be void in some versions).
 */
function ingest(dataset: string, data: unknown[]): void {
  if (!axiomClient) return;
  try {
    const maybePromise = (axiomClient as any).ingest(dataset, data);
    console.log('ingest maybePromise type:', typeof maybePromise);
    if (maybePromise && typeof maybePromise.then === 'function') {
      // Handle async errors without affecting request lifecycle
      (maybePromise as Promise<void>).catch((err) => {
        console.error('Axiom ingest error:', err);
      });
    }
  } catch (err) {
    console.error('Axiom ingest error (sync):', err);
  }
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
      }]);

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
        }]);

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

    // Database setup
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      console.warn('DATABASE_URL not set. API will error until it is configured.');
      throw new Error('DATABASE_URL is required');
    }
    
    const pool = new Pool({
      connectionString: DATABASE_URL
    });

    // Schema management
    async function ensureSchema() {
      try {
        // Users table
        await pool.query(`
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
        await pool.query(`
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
        await pool.query(`
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
        await pool.query(`
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
        await pool.query(`
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
        await pool.query(`
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
        await pool.query(`
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
        const adminExistsRes = await pool.query('SELECT 1 FROM users WHERE email = $1', ['admin@aarezhealth.com']);
        if (adminExistsRes.rowCount === 0) {
          console.log('Creating default admin user via ensureSchema...');
          const password_hash = await bcrypt.hash('admin123', 10);
          await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)', ['Umbra', 'admin@aarezhealth.com', password_hash, 'admin']);
          console.log('Default admin user created: admin@aarezhealth.com / admin123');
        }

        const extraUsers = [
          { name: 'User One', email: 'user1@aarezhealth.com', password: 'user123', role: 'user' },
          { name: 'User Two', email: 'user2@aarezhealth.com', password: 'user123', role: 'user' },
          { name: 'User Three', email: 'user3@aarezhealth.com', password: 'user123', role: 'user' }
        ];

        for (const u of extraUsers) {
          const userExistsRes = await pool.query('SELECT 1 FROM users WHERE email = $1', [u.email]);
          if (userExistsRes.rowCount === 0) {
            const password_hash = await bcrypt.hash(u.password, 10);
            await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)', [u.name, u.email, password_hash, u.role]);
            console.log(`Default user created via ensureSchema: ${u.email} / ${u.password}`);
          }
        }

        const mrExistsRes = await pool.query('SELECT 1 FROM users WHERE email = $1', ['mr@aarezhealth.com']);
        if (mrExistsRes.rowCount === 0) {
          console.log('Creating default MR user via ensureSchema...');
          const password_hash = await bcrypt.hash('mr123', 10);
          await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)', ['MR User', 'mr@aarezhealth.com', password_hash, 'mr']);
          console.log('Default MR user created: mr@aarezhealth.com / mr123');
        }
      } catch (err) {
        console.error('Schema creation error in ensureSchema:', err);
        // Log to Axiom
        ingest('vercel-errors', [{ type: 'ensureSchema', error: String(err), timestamp: new Date().toISOString() }]);
      }
    }

    // Run ensureSchema if enabled
    if (process.env.MIGRATE_ON_START !== 'false') {
      ensureSchema().catch(err => console.error('Auto-migration error', err));
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

    // Auth functions
    function signToken(payload: any) {
      return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    }

    function setAuthCookie(res: any, token: string) {
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'lax' : 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }

    function requireAuth(req: any, res: any, next: any) {
      const token = req.cookies.token;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
      } catch {
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
    app.get('/api/health', async (req, res) => {
      console.log('Health endpoint hit');
      try {
        // Test DB connection for health
        await pool.query('SELECT 1');
        const healthInfo = {
          ok: true,
          timestamp: new Date().toISOString(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV,
          activeRequests: activeRequests.get(),
          totalRequests: totalRequests.get(),
          dbConnected: true
        };
        
        // Log health check to Axiom
        ingest('vercel-health-checks', [healthInfo]);
        
        res.json(healthInfo);
      } catch (err) {
        console.error('Health check DB error:', err);
        ingest('vercel-errors', [{ type: 'health-db', error: String(err), timestamp: new Date().toISOString() }]);
        res.status(500).json({ ok: false, error: 'DB connection failed' });
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
        const result = await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role', [name, email, password_hash, 'user']);
        const user = result.rows[0];
        setAuthCookie(res, signToken({ id: user.id, email: user.email, role: user.role }));
        res.json(user);
      } catch (e: any) {
        if (String(e?.message || '').includes('duplicate key')) return res.status(409).json({ error: 'Email exists' });
        console.error('Register error:', e);
        ingest('vercel-errors', [{ type: 'auth-register', error: String(e), timestamp: new Date().toISOString() }]);
        res.status(500).json({ error: 'Registration failed' });
      }
    });

    app.post('/api/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT id, name, email, role, password_hash FROM users WHERE email = $1 LIMIT 1', [email]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
        setAuthCookie(res, signToken({ id: user.id, email: user.email, role: user.role }));
        const { password_hash, ...safe } = user;
        res.json(safe);
      } catch (e) {
        console.error('Login error:', e);
        ingest('vercel-errors', [{ type: 'auth-login', error: String(e), timestamp: new Date().toISOString() }]);
        res.status(500).json({ error: 'Login failed' });
      }
    });

    app.get('/api/auth/me', requireAuth, async (req: any, res) => {
      try {
        const { id } = req.user;
        const result = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
        res.json(result.rows[0] || null);
      } catch (e) {
        console.error('Me error:', e);
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
        const result = await pool.query('SELECT * FROM doctors ORDER BY created_at DESC LIMIT 100');
        res.json(result.rows);
      } catch (e) {
        console.error('Doctors get error:', e);
        res.status(500).json({ error: 'Failed to fetch doctors' });
      }
    });

    app.post('/api/doctors', requireAuth, async (req: any, res) => {
      try {
        const { code, name, specialty } = req.body;
        const result = await pool.query('INSERT INTO doctors (code, name, specialty) VALUES ($1, $2, $3) RETURNING *', [code, name, specialty]);
        res.json(result.rows[0]);
      } catch (e: any) {
        if (String(e?.message || '').includes('duplicate key')) return res.status(409).json({ error: 'Doctor code exists' });
        console.error('Doctors post error:', e);
        res.status(500).json({ error: 'Failed to create doctor' });
      }
    });

    // Products routes
    app.get('/api/products', requireAuth, async (req: any, res) => {
      try {
        const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC LIMIT 200');
        res.json(result.rows);
      } catch (e) {
        console.error('Products get error:', e);
        res.status(500).json({ error: 'Failed to fetch products' });
      }
    });

    app.post('/api/products', requireAuth, async (req: any, res) => {
      try {
        const { name, category, status, price, product_type, packaging_type, strips_per_box, units_per_strip } = req.body;
        const result = await pool.query('INSERT INTO products (name, category, status, price, product_type, packaging_type, strips_per_box, units_per_strip) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [name, category, status || 'Active', price || 0, product_type || null, packaging_type || null, strips_per_box || null, units_per_strip || null]);
        res.json(result.rows[0]);
      } catch (e) {
        console.error('Products post error:', e);
        res.status(500).json({ error: 'Failed to create product' });
      }
    });

    // Investments routes
    app.get('/api/investments', requireAuth, async (req: any, res) => {
      try {
        const result = await pool.query('SELECT * FROM investments ORDER BY created_at DESC LIMIT 200');
        res.json(result.rows);
      } catch (e) {
        console.error('Investments get error:', e);
        res.status(500).json({ error: 'Failed to fetch investments' });
      }
    });

    app.post('/api/investments', requireAuth, async (req: any, res) => {
      try {
        const { doctor_id, doctor_code, doctor_name, amount, investment_date, expected_returns, actual_returns, preferences, notes } = req.body;
        const result = await pool.query('INSERT INTO investments (doctor_id, doctor_code, doctor_name, amount, investment_date, expected_returns, actual_returns, preferences, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [doctor_id || null, doctor_code || null, doctor_name || null, amount, investment_date, expected_returns || null, actual_returns || null, preferences || null, notes || null, req.user.id]);
        res.json(result.rows[0]);
      } catch (e) {
        console.error('Investments post error:', e);
        res.status(500).json({ error: 'Failed to create investment' });
      }
    });

    app.get('/api/investments/summary', requireAuth, async (req: any, res) => {
      try {
        const result = await pool.query('SELECT COALESCE(SUM(amount),0)::numeric AS total_investments, COALESCE(SUM(expected_returns),0)::numeric AS total_expected, COALESCE(SUM(actual_returns),0)::numeric AS total_actual FROM investments');
        const r = result.rows[0] || { total_investments: 0, total_expected: 0, total_actual: 0 };
        res.json({ totalInvestments: Number(r.total_investments), totalExpected: Number(r.total_expected), totalActual: Number(r.total_actual) });
      } catch (e) {
        console.error('Investments summary error:', e);
        res.status(500).json({ error: 'Failed to fetch summary' });
      }
    });

    app.get('/api/investments/summary-by-month', requireAuth, async (req: any, res) => {
      try {
        const result = await pool.query('SELECT to_char(investment_date, \'YYYY-MM\') AS ym, COALESCE(SUM(amount),0)::numeric AS total_amount, COALESCE(SUM(actual_returns),0)::numeric AS total_actual FROM investments GROUP BY ym ORDER BY ym');
        const rows = result.rows;
        const labels = rows.map((r: any) => r.ym);
        const amounts = rows.map((r: any) => Number(r.total_amount));
        const actuals = rows.map((r: any) => Number(r.total_actual));
        res.json({ labels, amounts, actuals });
      } catch (e) {
        console.error('Investments monthly summary error:', e);
        res.status(500).json({ error: 'Failed to fetch monthly summary' });
      }
    });

    app.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
      try {
        const investmentResult = await pool.query('SELECT COUNT(*)::int as count FROM investments');
        const doctorResult = await pool.query('SELECT COUNT(DISTINCT doctor_code)::int as count FROM investments WHERE doctor_code IS NOT NULL');
        const productResult = await pool.query('SELECT COUNT(*)::int as count FROM products');
        const roiResult = await pool.query('SELECT CASE WHEN SUM(amount) > 0 THEN (SUM(COALESCE(actual_returns, 0)) / SUM(amount) * 100)::numeric ELSE 0 END as roi FROM investments');
        
        const investmentCount = investmentResult.rows[0].count;
        const doctorCount = doctorResult.rows[0].count;
        const productCount = productResult.rows[0].count;
        const roiData = roiResult.rows[0].roi;
        
        res.json({
          totalInvestments: investmentCount,
          activeDoctors: doctorCount,
          products: productCount,
          roi: Number(roiData || 0).toFixed(2)
        });
      } catch (e) {
        console.error('Dashboard stats error:', e);
        res.status(500).json({ error: 'Failed to fetch stats' });
      }
    });

    app.get('/api/investments/recent', requireAuth, async (req: any, res) => {
      try {
        const result = await pool.query('SELECT * FROM investments ORDER BY created_at DESC LIMIT 10');
        res.json(result.rows);
      } catch (e) {
        console.error('Recent investments error:', e);
        res.status(500).json({ error: 'Failed to fetch recent investments' });
      }
    });

    // Bills routes
    app.get('/api/bills', requireAuth, async (req: any, res) => {
      try {
        const result = await pool.query('SELECT * FROM bills ORDER BY created_at DESC LIMIT 100');
        res.json(result.rows);
      } catch (e) {
        console.error('Bills get error:', e);
        res.status(500).json({ error: 'Failed to fetch bills' });
      }
    });

    app.post('/api/bills', requireAuth, async (req: any, res) => {
      try {
        const { merchant, bill_date, total, items, raw_text, extracted } = req.body;
        const result = await pool.query('INSERT INTO bills (merchant, bill_date, total, items, raw_text, extracted, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [merchant || null, bill_date || null, total || 0, items || [], raw_text || null, extracted || {}, req.user.id]);
        res.json(result.rows[0]);
      } catch (e) {
        console.error('Bills post error:', e);
        res.status(500).json({ error: 'Failed to create bill' });
      }
    });

    // Pharmacies routes (basic, extend as needed)
    app.get('/api/pharmacies', requireAuth, async (req: any, res) => {
      try {
        const result = await pool.query('SELECT * FROM pharmacies ORDER BY created_at DESC LIMIT 100');
        res.json(result.rows);
      } catch (e) {
        console.error('Pharmacies get error:', e);
        res.status(500).json({ error: 'Failed to fetch pharmacies' });
      }
    });

    app.post('/api/pharmacies', requireAuth, async (req: any, res) => {
      try {
        const { name, city, address, product_with_count_given, date_given, current_stock_owns, due_date_amount, scheme_applied } = req.body;
        const result = await pool.query('INSERT INTO pharmacies (name, city, address, product_with_count_given, date_given, current_stock_owns, due_date_amount, scheme_applied, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [name, city, address, product_with_count_given || [], date_given, current_stock_owns || [], due_date_amount, scheme_applied || null, req.user.id]);
        res.json(result.rows[0]);
      } catch (e) {
        console.error('Pharmacies post error:', e);
        res.status(500).json({ error: 'Failed to create pharmacy' });
      }
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
