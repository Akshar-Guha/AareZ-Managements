import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

export function createApp() {
  const app = express();

  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.warn('DATABASE_URL not set. API will error until it is configured.');
    throw new Error('DATABASE_URL is required');
  }
  
  const pool = new Pool({
    connectionString: DATABASE_URL
  });

  app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  async function ensureSchema() {
    if (!DATABASE_URL) return;
    await sql`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS doctors (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      specialty TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      price NUMERIC(12,2) DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS investments (
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS bills (
      id SERIAL PRIMARY KEY,
      merchant TEXT,
      bill_date DATE,
      total NUMERIC(12,2),
      items JSONB,
      raw_text TEXT,
      extracted JSONB,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  }

  if (process.env.MIGRATE_ON_START !== 'false') {
    ensureSchema().catch(err => console.error('Migration error', err));
  }

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
    if (!token) return res.status(401).send('Unauthorized');
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      res.status(401).send('Unauthorized');
    }
  }

  // Health
  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // Auth
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).send('Missing fields');
    const password_hash = await bcrypt.hash(password, 10);
    try {
      const rows = await sql`INSERT INTO users (name, email, password_hash) VALUES (${name}, ${email}, ${password_hash}) RETURNING id, name, email, role`;
      const user = rows[0];
      setAuthCookie(res, signToken({ id: user.id, email: user.email, role: user.role }));
      res.json(user);
    } catch (e: any) {
      if (String(e?.message || '').includes('duplicate key')) return res.status(409).send('Email exists');
      res.status(500).send('Registration failed');
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const rows = await sql`SELECT id, name, email, role, password_hash FROM users WHERE email = ${email} LIMIT 1`;
    const user = rows[0];
    if (!user) return res.status(401).send('Invalid credentials');
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).send('Invalid credentials');
    setAuthCookie(res, signToken({ id: user.id, email: user.email, role: user.role }));
    const { password_hash, ...safe } = user;
    res.json(safe);
  });

  app.get('/api/auth/me', async (req: any, res) => {
    const token = req.cookies.token;
    if (!token) return res.json(null);
    try {
      const payload: any = jwt.verify(token, JWT_SECRET);
      const rows = await sql`SELECT id, name, email, role FROM users WHERE id = ${payload.id}`;
      res.json(rows[0] || null);
    } catch {
      res.json(null);
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.cookie('token', '', { httpOnly: true, maxAge: 0, path: '/' });
    res.json({ ok: true });
  });

  // Doctors
  app.get('/api/doctors', requireAuth, async (req: any, res) => {
    const rows = await sql`SELECT * FROM doctors ORDER BY created_at DESC LIMIT 100`;
    res.json(rows);
  });
  app.post('/api/doctors', requireAuth, async (req: any, res) => {
    const { code, name, specialty } = req.body;
    const rows = await sql`INSERT INTO doctors (code, name, specialty) VALUES (${code}, ${name}, ${specialty}) RETURNING *`;
    res.json(rows[0]);
  });

  // Products
  app.get('/api/products', requireAuth, async (req: any, res) => {
    const rows = await sql`SELECT * FROM products ORDER BY created_at DESC LIMIT 200`;
    res.json(rows);
  });
  app.post('/api/products', requireAuth, async (req: any, res) => {
    const { name, category, status, price } = req.body;
    const rows = await sql`INSERT INTO products (name, category, status, price) VALUES (${name}, ${category}, ${status}, ${price}) RETURNING *`;
    res.json(rows[0]);
  });

  // Investments
  app.get('/api/investments', requireAuth, async (req: any, res) => {
    const rows = await sql`SELECT * FROM investments ORDER BY created_at DESC LIMIT 200`;
    res.json(rows);
  });
  app.post('/api/investments', requireAuth, async (req: any, res) => {
    const { doctor_id, doctor_code, doctor_name, amount, investment_date, expected_returns, actual_returns, preferences, notes } = req.body;
    const rows = await sql`INSERT INTO investments (doctor_id, doctor_code, doctor_name, amount, investment_date, expected_returns, actual_returns, preferences, notes, created_by)
    VALUES (${doctor_id||null}, ${doctor_code||null}, ${doctor_name||null}, ${amount}, ${investment_date}, ${expected_returns||null}, ${actual_returns||null}, ${preferences||null}, ${notes||null}, ${req.user.id}) RETURNING *`;
    res.json(rows[0]);
  });

  app.get('/api/investments/summary', requireAuth, async (req: any, res) => {
    const rows = await sql`SELECT COALESCE(SUM(amount),0)::numeric AS total_investments, COALESCE(SUM(expected_returns),0)::numeric AS total_expected, COALESCE(SUM(actual_returns),0)::numeric AS total_actual FROM investments`;
    const r = rows[0] || { total_investments: 0, total_expected: 0, total_actual: 0 };
    res.json({ totalInvestments: Number(r.total_investments), totalExpected: Number(r.total_expected), totalActual: Number(r.total_actual) });
  });

  app.get('/api/investments/summary-by-month', requireAuth, async (req: any, res) => {
    const rows = await sql`SELECT to_char(investment_date, 'YYYY-MM') AS ym, COALESCE(SUM(amount),0)::numeric AS total_amount, COALESCE(SUM(actual_returns),0)::numeric AS total_actual
      FROM investments GROUP BY ym ORDER BY ym`;
    const labels = rows.map((r: any) => r.ym);
    const amounts = rows.map((r: any) => Number(r.total_amount));
    const actuals = rows.map((r: any) => Number(r.total_actual));
    res.json({ labels, amounts, actuals });
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
    const [investmentCount] = await sql`SELECT COUNT(*)::int as count FROM investments`;
    const [doctorCount] = await sql`SELECT COUNT(DISTINCT doctor_code)::int as count FROM investments WHERE doctor_code IS NOT NULL`;
    const [productCount] = await sql`SELECT COUNT(*)::int as count FROM products`;
    const [roiData] = await sql`SELECT 
      CASE WHEN SUM(amount) > 0 THEN (SUM(COALESCE(actual_returns, 0)) / SUM(amount) * 100)::numeric ELSE 0 END as roi
    FROM investments`;
    
    res.json({
      totalInvestments: investmentCount.count,
      activeDoctors: doctorCount.count,
      products: productCount.count,
      roi: Number(roiData.roi || 0).toFixed(2)
    });
  });

  app.get('/api/investments/recent', requireAuth, async (req: any, res) => {
    const rows = await sql`SELECT * FROM investments ORDER BY created_at DESC LIMIT 10`;
    res.json(rows);
  });

  // Bills
  app.get('/api/bills', requireAuth, async (req: any, res) => {
    const rows = await sql`SELECT * FROM bills ORDER BY created_at DESC LIMIT 100`;
    res.json(rows);
  });
  app.post('/api/bills', requireAuth, async (req: any, res) => {
    const { merchant, bill_date, total, items, raw_text, extracted } = req.body;
    const rows = await sql`INSERT INTO bills (merchant, bill_date, total, items, raw_text, extracted, created_by)
    VALUES (${merchant||null}, ${bill_date||null}, ${total||0}, ${items||[]}, ${raw_text||null}, ${extracted||{}}, ${req.user.id}) RETURNING *`;
    res.json(rows[0]);
  });

  return app;
}
