import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { z } from 'zod';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:password@host:port/database'; // Provide a default for local dev
if (!DATABASE_URL) {
  console.warn('DATABASE_URL not set. API will error until it is configured.');
  throw new Error('DATABASE_URL is required');
}
const pool = new Pool({
  connectionString: DATABASE_URL
});

export async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'mr',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS doctors (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      specialty TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      price NUMERIC(12,2) DEFAULT 0,
      product_type TEXT, // e.g., 'tablet', 'liquid'
      packaging_type TEXT, // e.g., 'strip', 'bottle', 'vial'
      strips_per_box INTEGER, // For tablets in strips
      units_per_strip INTEGER, // For tablets in strips (e.g., 10 tablets/strip)
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS investments (
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
    )`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS bills (
      id SERIAL PRIMARY KEY,
      merchant TEXT,
      bill_date DATE,
      total NUMERIC(12,2),
      items JSONB,
      raw_text TEXT,
      extracted JSONB,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS pharmacies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      product_with_count_given JSONB DEFAULT '[]'::jsonb,
      date_given DATE NOT NULL,
      current_stock_owns JSONB DEFAULT '[]'::jsonb,
      due_date_amount DATE NOT NULL,
      scheme_applied TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    const { rows } = await client.query('SELECT * FROM users WHERE email = $1', ['admin@aarezhealth.com']);
    if (rows.length === 0) {
      console.log('Creating default admin user...');
      const password_hash = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['Umbra', 'admin@aarezhealth.com', password_hash, 'admin']
      );
      console.log('Default admin user created: admin@aarezhealth.com / admin123');

    // Add 3 additional users with role 'user'
    const extraUsers = [
      { name: 'User One', email: 'user1@aarezhealth.com', password: 'user123' },
      { name: 'User Two', email: 'user2@aarezhealth.com', password: 'user123' },
      { name: 'User Three', email: 'user3@aarezhealth.com', password: 'user123' }
    ];
    for (const u of extraUsers) {
      const { rows: userRows } = await client.query('SELECT * FROM users WHERE email = $1', [u.email]);
      if (userRows.length === 0) {
        const password_hash = await bcrypt.hash(u.password, 10);
        await client.query(
          'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
          [u.name, u.email, password_hash, 'user']
        );
        console.log(`Default user created: ${u.email} / ${u.password}`);
      }
    }
    }

    const { rows: mrRows } = await client.query('SELECT * FROM users WHERE email = $1', ['mr@aarezhealth.com']);
    if (mrRows.length === 0) {
      console.log('Creating default MR user...');
      const password_hash = await bcrypt.hash('mr123', 10);
      await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['MR User', 'mr@aarezhealth.com', password_hash, 'mr']
      );
      console.log('Default MR user created: mr@aarezhealth.com / mr123');
    }
  } finally {
    client.release();
  }
}

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Healthcare Manager API',
      version: '1.0.0',
      description: 'API documentation for the Healthcare Manager application',
    },
    servers: [
      {
        url: '/api',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['./api/app.ts'], // files containing annotations for the OpenAPI specification
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export function createApp() {
  const app = express();

  // Moved to top-level for direct export: JWT_SECRET, DATABASE_URL, pool

  app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  if (process.env.MIGRATE_ON_START !== 'false') {
    // Now called explicitly in api-local/server.ts, can remove this if desired
    // ensureSchema().catch(err => console.error('Migration error', err));
  }

  function signToken(payload: any) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }
  
  function setAuthCookie(res: any, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'lax' : 'none', // Set to 'none' for development to allow cross-site cookies
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
    } catch (err) {
      next(err); // Pass error to the error handling middleware
    }
  }

  function requireRole(role: string) {
    return (req: any, res: any, next: any) => {
      if (!req.user || req.user.role !== role) {
        return res.status(403).send('Forbidden');
      }
      next();
    };
  }

  // Build dynamic WHERE clause for investments based on query params
  function buildInvestmentWhere(query: any) {
    const clauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const monthRaw = String(query.month || '');
    const month = monthRaw && monthRaw !== 'All' ? monthRaw.padStart(2, '0') : '';
    const year = String(query.year || '');
    const startDate = query.startDate;
    const endDate = query.endDate;
    const doctor = query.doctor;

    if (startDate) {
      clauses.push(`investment_date >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      clauses.push(`investment_date <= $${idx++}`);
      params.push(endDate);
    }
    if (year && year !== 'All') {
      clauses.push(`to_char(investment_date, 'YYYY') = $${idx++}`);
      params.push(year);
    }
    if (month) {
      clauses.push(`to_char(investment_date, 'MM') = $${idx++}`);
      params.push(month);
    }
    if (doctor && doctor !== 'All Doctors') {
      clauses.push(`(doctor_code = $${idx} OR doctor_name = $${idx})`);
      params.push(doctor);
      idx++;
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return { where, params };
  }

  const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters long"),
    email: z.string().email("Invalid email address"),
    password: z.string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  });

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health
  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // Auth
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Register a new user
   *     tags:
   *       - Auth
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - email
   *               - password
   *             properties:
   *               name:
   *                 type: string
   *                 description: User's name
   *                 example: John Doe
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User's email address
   *                 example: john.doe@example.com
   *               password:
   *                 type: string
   *                 format: password
   *                 description: User's password (min 8 characters, with uppercase, lowercase, number, and special character)
   *                 example: Password123!
   *     responses:
   *       200:
   *         description: User registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: number
   *                 name:
   *                   type: string
   *                 email:
   *                   type: string
   *                 role:
   *                   type: string
   *       400:
   *         description: Bad request (e.g., missing fields, invalid password)
   *       409:
   *         description: Email already exists
   *       500:
   *         description: Internal server error
   */
  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const { name, email, password } = registerSchema.parse(req.body);
      const password_hash = await bcrypt.hash(password, 10);
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role',
          [name, email, password_hash]
        );
        const user = result.rows[0];
        setAuthCookie(res, signToken({ id: user.id, email: user.email, role: user.role }));
        res.json(user);
      } catch (e: any) {
        if (String(e?.message || '').includes('duplicate key')) return res.status(409).send('Email exists');
        // Pass other errors to the error handling middleware
        next(e);
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      // Pass other errors to the error handling middleware
      next(error);
    }
  });

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Log in a user
   *     tags:
   *       - Auth
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User's email address
   *                 example: john.doe@example.com
   *               password:
   *                 type: string
   *                 format: password
   *                 description: User's password
   *                 example: Password123!
   *     responses:
   *       200:
   *         description: User logged in successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: number
   *                 name:
   *                   type: string
   *                 email:
   *                   type: string
   *                 role:
   *                   type: string
   *       401:
   *         description: Invalid credentials
   *       500:
   *         description: Internal server error
   */
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, name, email, role, password_hash FROM users WHERE email = $1 LIMIT 1',
        [email]
      );
      const user = result.rows[0];
      if (!user) return res.status(401).send('Invalid credentials');
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).send('Invalid credentials');
      setAuthCookie(res, signToken({ id: user.id, email: user.email, role: user.role }));
      const { password_hash, ...safe } = user;
      res.json(safe);
    } finally {
      client.release();
    }
  });

  app.get('/api/auth/me', async (req: any, res) => {
    const token = req.cookies.token;
    if (!token) return res.json(null);
    try {
      const payload: any = jwt.verify(token, JWT_SECRET);
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT id, name, email, role FROM users WHERE id = $1',
          [payload.id]
        );
        res.json(result.rows[0] || null);
      } finally {
        client.release();
      }
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
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM doctors ORDER BY created_at DESC LIMIT 100');
      res.json(result.rows);
    } finally {
      client.release();
    }
  });
  
  app.post('/api/doctors', requireAuth, async (req: any, res) => {
    const { code, name, specialty } = req.body;
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO doctors (code, name, specialty) VALUES ($1, $2, $3) RETURNING *',
        [code, name, specialty]
      );
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  });

  // Products
  const productSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    category: z.string().min(1, "Category is required"),
    status: z.string().optional().default('Active'),
    price: z.number().min(0).optional().default(0),
    product_type: z.string().optional().nullable(),
    packaging_type: z.string().optional().nullable(),
    strips_per_box: z.number().int().min(0).optional().nullable(),
    units_per_strip: z.number().int().min(0).optional().nullable(),
  });

  app.get('/api/products', requireAuth, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM products ORDER BY created_at DESC LIMIT 200');
      res.json(result.rows);
    } finally {
      client.release();
    }
  });
  
  app.post('/api/products', requireAuth, async (req: any, res, next) => {
    try {
      const validatedData = productSchema.parse(req.body);
      const { name, category, status, price, product_type, packaging_type, strips_per_box, units_per_strip } = validatedData;

      const client = await pool.connect();
      try {
        const result = await client.query(
          'INSERT INTO products (name, category, status, price, product_type, packaging_type, strips_per_box, units_per_strip) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
          [name, category, status, price, product_type || null, packaging_type || null, strips_per_box || null, units_per_strip || null]
        );
        res.status(201).json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  app.put('/api/products/:id', requireAuth, async (req: any, res, next) => {
    const { id } = req.params;
    try {
      const validatedData = productSchema.partial().parse(req.body);
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      for (const key in validatedData) {
        if (validatedData.hasOwnProperty(key)) {
          updateFields.push(`${key}=$${paramIndex++}`);
          updateValues.push((validatedData as any)[key]);
        }
      }

      if (updateValues.length === 0) return res.status(400).send('No fields to update');

      const client = await pool.connect();
      try {
        const result = await client.query(
          `UPDATE products SET ${updateFields.join(', ')} WHERE id=$${paramIndex} RETURNING * `,
          [...updateValues, id]
        );

        if (result.rows.length === 0) return res.status(404).send('Product not found');
        res.json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  // Investments
  app.get('/api/investments', requireAuth, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const { where, params } = buildInvestmentWhere(req.query || {});
      const sql = `SELECT * FROM investments ${where} ORDER BY investment_date DESC, created_at DESC LIMIT 500`;
      const result = await client.query(sql, params);
      res.json(result.rows);
    } finally {
      client.release();
    }
  });
  
  app.post('/api/investments', requireAuth, async (req: any, res) => {
    const { doctor_name, amount, investment_date, expected_returns, actual_returns, preferences, notes } = req.body;
    const client = await pool.connect();
    try {
      let doctor_id = null;
      let doctor_code = null; // We'll set this if we create a new doctor

      if (doctor_name) {
        // Try to find an existing doctor
        let doctorResult = await client.query('SELECT id, code FROM doctors WHERE name = $1', [doctor_name]);
        if (doctorResult.rows.length > 0) {
          doctor_id = doctorResult.rows[0].id;
          doctor_code = doctorResult.rows[0].code;
        } else {
          // If doctor not found, create a new one
          // Generate a simple code, e.g., DOC-UUID_SHORT_HASH
          const newDoctorCode = `DOC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
          const newDoctorResult = await client.query(
            'INSERT INTO doctors (name, code) VALUES ($1, $2) RETURNING id, code',
            [doctor_name, newDoctorCode]
          );
          doctor_id = newDoctorResult.rows[0].id;
          doctor_code = newDoctorResult.rows[0].code;
        }
      }

      const result = await client.query(
        'INSERT INTO investments (doctor_id, doctor_code, doctor_name, amount, investment_date, expected_returns, actual_returns, preferences, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [doctor_id||null, doctor_code||null, doctor_name||null, amount, investment_date, expected_returns||null, actual_returns||null, preferences||null, notes||null, req.user.id]
      );
      res.json(result.rows[0]);

      // Log activity
      await client.query(
        'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'CREATE', 'investment', result.rows[0].id, JSON.stringify({ new_investment: result.rows[0] })]
      );

    } finally {
      client.release();
    }
  });

  app.put('/api/investments/:id', requireAuth, async (req: any, res) => {
    const { id } = req.params;
    const { doctor_name, amount, investment_date, expected_returns, actual_returns, preferences, notes } = req.body;
    const client = await pool.connect();
    try {
      let doctor_id = null;
      let doctor_code = null;

      if (doctor_name) {
        let doctorResult = await client.query('SELECT id, code FROM doctors WHERE name = $1', [doctor_name]);
        if (doctorResult.rows.length > 0) {
          doctor_id = doctorResult.rows[0].id;
          doctor_code = doctorResult.rows[0].code;
        } else {
          // If doctor not found, create a new one
          const newDoctorCode = `DOC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
          const newDoctorResult = await client.query(
            'INSERT INTO doctors (name, code) VALUES ($1, $2) RETURNING id, code',
            [doctor_name, newDoctorCode]
          );
          doctor_id = newDoctorResult.rows[0].id;
          doctor_code = newDoctorResult.rows[0].code;
        }
      }

      // Fetch old data before updating
      const oldDataResult = await client.query('SELECT * FROM investments WHERE id = $1', [id]);
      const old_data = oldDataResult.rows[0];

      const result = await client.query(
        'UPDATE investments SET doctor_id=$1, doctor_code=$2, doctor_name=$3, amount=$4, investment_date=$5, expected_returns=$6, actual_returns=$7, preferences=$8, notes=$9 WHERE id=$10 RETURNING * ',
        [doctor_id||null, doctor_code||null, doctor_name||null, amount, investment_date, expected_returns||null, actual_returns||null, preferences||null, notes||null, id]
      );
      if (result.rows.length === 0) return res.status(404).send('Investment not found');

      // Log activity with specific changes
      const new_data = result.rows[0]; // The updated row from the DB
      const changes: string[] = [];

      const fieldsToCompare = [
        'doctor_name',
        'amount',
        'investment_date',
        'expected_returns',
        'actual_returns',
        'notes'
      ];

      for (const field of fieldsToCompare) {
        const oldValue = old_data[field] === null ? "empty" : String(old_data[field]).trim();
        const newValue = new_data[field] === null ? "empty" : String(new_data[field]).trim();

        if (oldValue !== newValue) {
          changes.push(`'${field}' changed from '${oldValue}' to '${newValue}'`);
        }
      }

      // Handle preferences, which are TEXT[]
      const oldPreferences = new Set(old_data.preferences ? old_data.preferences.map((p: string) => p.trim()) : []);
      const newPreferences = new Set(new_data.preferences ? new_data.preferences.map((p: string) => p.trim()) : []);

      const addedPreferences = [...newPreferences].filter(p => !oldPreferences.has(p));
      const removedPreferences = [...oldPreferences].filter(p => !newPreferences.has(p));

      if (addedPreferences.length > 0) {
        changes.push(`added preferences: [${addedPreferences.map(p => `'${p}'`).join(', ')}]`);
      }
      if (removedPreferences.length > 0) {
        changes.push(`removed preferences: [${removedPreferences.map(p => `'${p}'`).join(', ')}]`);
      }

      let detailsMessage = `Investment (ID: ${id}) updated.`;
      if (changes.length > 0) {
        detailsMessage += ' Details: ' + changes.join('; ');
      } else {
        detailsMessage += ' No significant changes detected.';
      }

      await client.query(
        'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'UPDATE', 'investment', id, detailsMessage]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Failed to update investment:', err);
      res.status(500).send('Failed to update investment');
    } finally {
      client.release();
    }
  });

  /**
   * @swagger
   * /investments/{id}:
   *   delete:
   *     summary: Delete an investment by ID
   *     tags:
   *       - Investments
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Numeric ID of the investment to delete
   *     responses:
   *       204:
   *         description: Investment successfully deleted
   *       401:
   *         description: Unauthorized, no valid token
   *       403:
   *         description: Forbidden, user does not have 'admin' role
   *       404:
   *         description: Investment not found
   *       500:
   *         description: Internal server error
   */
  app.delete('/api/investments/:id', requireAuth, requireRole('admin'), async (req: any, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      // Check if investment exists before deleting
      const checkResult = await client.query('SELECT * FROM investments WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) return res.status(404).send('Investment not found');

      const deletedInvestment = checkResult.rows[0]; // Store the investment data before deletion

      // Perform the delete operation
      await client.query('DELETE FROM investments WHERE id = $1', [id]);

      // Log activity
      await client.query(
        'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'DELETE', 'investment', id, JSON.stringify({ deleted_investment: deletedInvestment })]
      );

      res.status(204).send();
    } catch (err) {
      console.error('Failed to delete investment:', err);
      res.status(500).send('Failed to delete investment');
    } finally {
      client.release();
    }
  });

  app.get('/api/investments/summary', requireAuth, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const { where, params } = buildInvestmentWhere(req.query || {});
      const sql = `SELECT COALESCE(SUM(amount),0)::numeric AS total_investments, COALESCE(SUM(expected_returns),0)::numeric AS total_expected, COALESCE(SUM(actual_returns),0)::numeric AS total_actual FROM investments ${where}`;
      const result = await client.query(sql, params);
      const r = result.rows[0] || { total_investments: 0, total_expected: 0, total_actual: 0 };
      res.json({ 
        totalInvestments: Number(r.total_investments), 
        totalExpected: Number(r.total_expected), 
        totalActual: Number(r.total_actual) 
      });
    } finally {
      client.release();
    }
  });

  app.get('/api/investments/summary-by-month', requireAuth, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const { where, params } = buildInvestmentWhere(req.query || {});
      const sql = `SELECT to_char(investment_date, 'YYYY-MM') AS ym, COALESCE(SUM(amount),0)::numeric AS total_amount, COALESCE(SUM(actual_returns),0)::numeric AS total_actual
        FROM investments ${where} GROUP BY ym ORDER BY ym`;
      const result = await client.query(sql, params);
      const labels = result.rows.map((r: any) => r.ym);
      const amounts = result.rows.map((r: any) => Number(r.total_amount));
      const actuals = result.rows.map((r: any) => Number(r.total_actual));
      res.json({ labels, amounts, actuals });
    } finally {
      client.release();
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const investmentCountResult = await client.query('SELECT COUNT(*)::int as count FROM investments');
      const doctorCountResult = await client.query('SELECT COUNT(DISTINCT doctor_code)::int as count FROM investments');
      const productCountResult = await client.query('SELECT COUNT(*)::int as count FROM products');
      const roiResult = await client.query(
        'SELECT CASE WHEN SUM(amount) > 0 THEN (SUM(COALESCE(actual_returns, 0)) / SUM(amount) * 100)::numeric ELSE 0 END as roi FROM investments'
      );
      
      res.json({
        totalInvestments: investmentCountResult.rows[0].count,
        activeDoctors: doctorCountResult.rows[0].count,
        products: productCountResult.rows[0].count,
        roi: Number(roiResult.rows[0].roi || 0).toFixed(2)
      });
    } finally {
      client.release();
    }
  });

  app.get('/api/investments/recent', requireAuth, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM investments ORDER BY created_at DESC LIMIT 10');
      res.json(result.rows);
    } finally {
      client.release();
    }
  });

  // Bills
  app.get('/api/bills', requireAuth, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM bills ORDER BY created_at DESC LIMIT 100');
      res.json(result.rows);
    } finally {
      client.release();
    }
  });
  
  app.post('/api/bills', requireAuth, async (req: any, res) => {
    const { merchant, bill_date, total, items, raw_text, extracted } = req.body;
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO bills (merchant, bill_date, total, items, raw_text, extracted, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [merchant||null, bill_date||null, total||0, JSON.stringify(items||[]), raw_text||null, JSON.stringify(extracted||{}), req.user.id]
      );
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  });

  app.post('/api/logs', requireAuth, async (req: any, res) => {
    const { action, entity_type, entity_id, details } = req.body;
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, action, entity_type, entity_id || null, details ? JSON.stringify(details) : null]
      );
      res.status(201).json({ ok: true });
    } catch (err) {
      console.error('Failed to create log:', err);
      res.status(500).json({ ok: false, error: 'Failed to create log' });
    } finally {
      client.release();
    }
  });

  app.get('/api/logs', requireAuth, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT al.*, u.name as user_name FROM activity_logs al JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 100'
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  });

  // Pharmacies
  const pharmacySchema = z.object({
    name: z.string().min(1, "Pharmacy name is required"),
    city: z.string().min(1, "City is required"),
    address: z.string().min(1, "Address is required"),
    product_with_count_given: z.array(z.object({
      productName: z.string().min(1),
      count: z.number().int().min(0),
    })).optional().default([]),
    date_given: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
    current_stock_owns: z.array(z.object({
      productName: z.string().min(1),
      count: z.number().int().min(0),
    })).optional().default([]),
    due_date_amount: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
    scheme_applied: z.string().optional().nullable(),
  });

  app.post('/api/pharmacies', requireAuth, async (req: any, res, next) => {
    try {
      const validatedData = pharmacySchema.parse(req.body);
      const { name, city, address, product_with_count_given, date_given, current_stock_owns, due_date_amount, scheme_applied } = validatedData;

      const client = await pool.connect();
      try {
        const result = await client.query(
          'INSERT INTO pharmacies (name, city, address, product_with_count_given, date_given, current_stock_owns, due_date_amount, scheme_applied, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING * ',
          [name, city, address, JSON.stringify(product_with_count_given), date_given, JSON.stringify(current_stock_owns), due_date_amount, scheme_applied, req.user.id]
        );
        res.status(201).json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  app.get('/api/pharmacies', requireAuth, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM pharmacies ORDER BY created_at DESC');
      res.json(result.rows);
    } finally {
      client.release();
    }
  });

  app.get('/api/pharmacies/:id', requireAuth, async (req: any, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM pharmacies WHERE id = $1', [id]);
      if (result.rows.length === 0) return res.status(404).send('Pharmacy not found');
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  });

  app.put('/api/pharmacies/:id', requireAuth, async (req: any, res, next) => {
    const { id } = req.params;
    try {
      // Use a partial schema for updates, allowing some fields to be optional
      const validatedData = pharmacySchema.partial().parse(req.body);
      const fields = Object.keys(validatedData).map((key, idx) => `${key}=$${idx + 1}`).join(', ');
      const values = Object.values(validatedData);

      if (values.length === 0) return res.status(400).send('No fields to update');

      const client = await pool.connect();
      try {
        // Handle JSONB fields separately for stringify
        const updateValues: any[] = [];
        const updateFields: string[] = [];
        let paramIndex = 1;

        for (const key in validatedData) {
          if (validatedData.hasOwnProperty(key)) {
            if (key === 'product_with_count_given' || key === 'current_stock_owns') {
              updateFields.push(`${key}=$${paramIndex++}::jsonb`);
              updateValues.push(JSON.stringify((validatedData as any)[key]));
            } else {
              updateFields.push(`${key}=$${paramIndex++}`);
              updateValues.push((validatedData as any)[key]);
            }
          }
        }

        const result = await client.query(
          `UPDATE pharmacies SET ${updateFields.join(', ')} WHERE id=$${paramIndex} RETURNING * `,
          [...updateValues, id]
        );

        if (result.rows.length === 0) return res.status(404).send('Pharmacy not found');
        res.json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  app.delete('/api/pharmacies/:id', requireAuth, async (req: any, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM pharmacies WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) return res.status(404).send('Pharmacy not found');
      res.status(204).send();
    } finally {
      client.release();
    }
  });

  // Generic error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled error:', err); // Log the error for debugging
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred.',
    });
  });

  return app;
}
