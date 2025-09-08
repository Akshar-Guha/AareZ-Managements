import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios'; // Import axios
// import { Pool } from 'pg'; // Remove pg import
import { z } from 'zod';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const NEON_API_KEY = process.env.NEON_API_KEY;
const NEON_DATA_API_URL = process.env.NEON_DATA_API_URL || 'https://your-neon-data-api-endpoint/rest/v1'; // Default for local dev

if (!NEON_API_KEY) {
  console.error('NEON_API_KEY not set. Data API calls will fail.');
}
if (!NEON_DATA_API_URL) {
  console.error('NEON_DATA_API_URL not set. Data API calls will fail.');
}

// Remove DATABASE_URL and pool setup
// const DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:password@host:port/database';
// if (!DATABASE_URL) {
//   console.warn('DATABASE_URL not set. API will error until it is configured.');
//   throw new Error('DATABASE_URL is required');
// }
// const pool = new Pool({
//   connectionString: DATABASE_URL
// });

// Helper for making authenticated Data API requests
async function neonDataApiRequest(method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any, queryParams?: any) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NEON_API_KEY}`,
    };
    let url = `${NEON_DATA_API_URL}${path}`;

    console.log(`[Neon Data API] Calling ${method.toUpperCase()} ${url} with params:`, queryParams, 'data:', data);

    let response;
    if (method === 'get') {
      response = await axios.get(url, { headers, params: queryParams });
    } else if (method === 'post') {
      response = await axios.post(url, data, { headers });
    } else if (method === 'put') {
      response = await axios.put(url, data, { headers });
    } else if (method === 'delete') {
      response = await axios.delete(url, { headers, data: data || queryParams }); // delete can use data or params
    }
    return response?.data; // Return the data part of the response
  } catch (error: any) {
    console.error(`Neon Data API ${method.toUpperCase()} request to ${path} failed:`, error.response?.data || error.message);
    throw new Error(`Data API request failed: ${error.response?.data?.message || error.message}`);
  }
}

// export async function ensureSchema() {
//   // This function will need a major refactor as it directly uses SQL with pg.Pool
//   // For now, it will remain as is, but will not work with the Data API.
//   // We need to implement schema creation via Data API (if supported) or a separate migration tool.
//   console.warn('ensureSchema() currently uses pg.Pool and will not work with Neon Data API. Manual schema creation or a migration strategy is required.');
//   // For now, we'll mock a successful schema creation to avoid immediate blocking errors
//   return Promise.resolve();
// }

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

  // Log important environment variables for debugging
  console.log('--- Environment Variables ---');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
  console.log('NEON_DATA_API_URL:', process.env.NEON_DATA_API_URL ? 'SET' : 'NOT SET');
  console.log('NEON_API_KEY:', process.env.NEON_API_KEY ? 'SET' : 'NOT SET');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
  console.log('---------------------------');

  // Moved to top-level for direct export: JWT_SECRET, DATABASE_URL, pool

  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }));
  app.use(express.json());
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
      
      // This part of the code will need to be refactored to use the Data API
      // For now, it will return an error as the Data API is not fully integrated
      // and the pg.Pool is removed.
      // Refactor to Data API
      const existingUsers = await neonDataApiRequest('get', '/users', { email: `eq.${email}` });
      if (existingUsers && existingUsers.length > 0) {
        return res.status(409).send('Email exists');
      }
    
      const newUser = await neonDataApiRequest('post', '/users', {
        name,
        email,
        password_hash,
        role: 'user', // Default role
      });
    
      if (newUser && newUser.length > 0) {
        const user = newUser[0];
        setAuthCookie(res, signToken({ id: user.id, email: user.email, role: user.role }));
        res.json(user);
      } else {
        throw new Error('Failed to create user via Data API.');
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
   *                 role:
   *                   type: string
   *       401:
   *         description: Invalid credentials
   *       500:
   *         description: Internal server error
   */
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
    const users = await neonDataApiRequest('get', '/users', { email: `eq.${email}` });
    const user = users && users.length > 0 ? users[0] : null;

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
      // This part of the code will need to be refactored to use the Data API
      // For now, it will return an error as the Data API is not fully integrated
      // and the pg.Pool is removed.
      // Refactor to Data API
      const users = await neonDataApiRequest('get', '/users', { id: `eq.${payload.id}` });
      res.json(users && users.length > 0 ? users[0] : null);

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
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
    const doctors = await neonDataApiRequest('get', '/doctors', {}, { limit: 100, order: 'created_at.desc' });
    res.json(doctors);
  });
  
  app.post('/api/doctors', requireAuth, async (req: any, res) => {
    const { code, name, specialty } = req.body;
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
    const newDoctor = await neonDataApiRequest('post', '/doctors', { code, name, specialty });
    if (newDoctor && newDoctor.length > 0) {
      res.json(newDoctor[0]);
    } else {
      throw new Error('Failed to create doctor via Data API.');
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
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
    const products = await neonDataApiRequest('get', '/products', {}, { limit: 200, order: 'created_at.desc' });
    res.json(products);
  });
  
  app.post('/api/products', requireAuth, async (req: any, res, next) => {
    try {
      const validatedData = productSchema.parse(req.body);
      const { name, category, status, price, product_type, packaging_type, strips_per_box, units_per_strip } = validatedData;

      // This part of the code will need to be refactored to use the Data API
      // For now, it will return an error as the Data API is not fully integrated
      // and the pg.Pool is removed.
      // Refactor to Data API
      const newProduct = await neonDataApiRequest('post', '/products', {
        name, category, status, price, product_type, packaging_type, strips_per_box, units_per_strip
      });
      if (newProduct && newProduct.length > 0) {
        res.status(201).json(newProduct[0]);
      } else {
        throw new Error('Failed to create product via Data API.');
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

      // This part of the code will need to be refactored to use the Data API
      // For now, it will return an error as the Data API is not fully integrated
      // and the pg.Pool is removed.
      const updatedProduct = await neonDataApiRequest('put', '/products', validatedData, { id: `eq.${id}` });
      if (updatedProduct && updatedProduct.length > 0) {
        res.json(updatedProduct[0]);
      } else {
        return res.status(404).send('Product not found');
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
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
      const { where, params } = buildInvestmentWhere(req.query || {});
    // Convert Knex-like params to Data API query parameters
    const queryParams: Record<string, string> = {};
    // Assuming `where` will be a string like 'investment_date >= $1 AND ...'
    // and params is an array, this conversion needs to be more sophisticated
    // For now, a simplified approach:
    if (req.query.month) queryParams.month = `eq.${req.query.month}`;
    if (req.query.year) queryParams.year = `eq.${req.query.year}`;
    if (req.query.startDate) queryParams.investment_date = `gte.${req.query.startDate}`;
    if (req.query.endDate) queryParams.investment_date_end = `lte.${req.query.endDate}`;
    if (req.query.doctor && req.query.doctor !== 'All Doctors') {
      // Data API might not support OR directly in query params, might need multiple filters or views
      queryParams['or'] = `(doctor_code.eq.${req.query.doctor},doctor_name.eq.${req.query.doctor})`;
    }

    const investments = await neonDataApiRequest('get', '/investments', {}, {
      ...queryParams,
      limit: 500,
      order: 'investment_date.desc,created_at.desc'
    });
    res.json(investments);
  });
  
  app.post('/api/investments', requireAuth, async (req: any, res) => {
    const { doctor_name, amount, investment_date, expected_returns, actual_returns, preferences, notes } = req.body;
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
      let doctor_id = null;
    let doctor_code = null;

      if (doctor_name) {
      const doctorResult = await neonDataApiRequest('get', '/doctors', { name: `eq.${doctor_name}` });
      if (doctorResult && doctorResult.length > 0) {
        doctor_id = doctorResult[0].id;
        doctor_code = doctorResult[0].code;
        } else {
          const newDoctorCode = `DOC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const newDoctorResult = await neonDataApiRequest('post', '/doctors', { name: doctor_name, code: newDoctorCode });
        if (newDoctorResult && newDoctorResult.length > 0) {
          doctor_id = newDoctorResult[0].id;
          doctor_code = newDoctorResult[0].code;
        } else {
          throw new Error('Failed to create new doctor via Data API.');
        }
      }
    }

    const newInvestment = await neonDataApiRequest('post', '/investments', {
      doctor_id: doctor_id || null,
      doctor_code: doctor_code || null,
      doctor_name: doctor_name || null,
      amount,
      investment_date,
      expected_returns: expected_returns || null,
      actual_returns: actual_returns || null,
      preferences: preferences || null,
      notes: notes || null,
      created_by: req.user.id,
    });

    if (newInvestment && newInvestment.length > 0) {
      // Log activity
      await neonDataApiRequest('post', '/activity_logs', {
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'investment',
        entity_id: newInvestment[0].id,
        details: JSON.stringify({ new_investment: newInvestment[0] }),
      });
      res.json(newInvestment[0]);
    } else {
      throw new Error('Failed to create investment via Data API.');
    }

  });

  app.put('/api/investments/:id', requireAuth, async (req: any, res) => {
    const { id } = req.params;
    const { doctor_name, amount, investment_date, expected_returns, actual_returns, preferences, notes } = req.body;
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
      let doctor_id = null;
      let doctor_code = null;

      if (doctor_name) {
      const doctorResult = await neonDataApiRequest('get', '/doctors', { name: `eq.${doctor_name}` });
      if (doctorResult && doctorResult.length > 0) {
        doctor_id = doctorResult[0].id;
        doctor_code = doctorResult[0].code;
        } else {
          const newDoctorCode = `DOC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const newDoctorResult = await neonDataApiRequest('post', '/doctors', { name: doctor_name, code: newDoctorCode });
        if (newDoctorResult && newDoctorResult.length > 0) {
          doctor_id = newDoctorResult[0].id;
          doctor_code = newDoctorResult[0].code;
        } else {
          throw new Error('Failed to create new doctor via Data API.');
        }
      }
    }

    // Fetch old data before updating for activity logging
    const oldDataResult = await neonDataApiRequest('get', '/investments', { id: `eq.${id}` });
    const old_data = oldDataResult && oldDataResult.length > 0 ? oldDataResult[0] : null;

    if (!old_data) return res.status(404).send('Investment not found');

    const updatedData = {
      doctor_id: doctor_id || null,
      doctor_code: doctor_code || null,
      doctor_name: doctor_name || null,
      amount,
      investment_date,
      expected_returns: expected_returns || null,
      actual_returns: actual_returns || null,
      preferences: preferences || null,
      notes: notes || null,
    };

    const updatedInvestment = await neonDataApiRequest('put', '/investments', updatedData, { id: `eq.${id}` });

    if (updatedInvestment && updatedInvestment.length > 0) {
      const new_data = updatedInvestment[0];
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

      await neonDataApiRequest('post', '/activity_logs', {
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'investment',
        entity_id: id,
        details: detailsMessage,
      });

      res.json(new_data);
    } else {
      return res.status(404).send('Investment not found');
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
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    const checkResult = await neonDataApiRequest('get', '/investments', { id: `eq.${id}` });
    if (!checkResult || checkResult.length === 0) return res.status(404).send('Investment not found');

    const deletedInvestment = checkResult[0];

    await neonDataApiRequest('delete', '/investments', {}, { id: `eq.${id}` });

    await neonDataApiRequest('post', '/activity_logs', {
      user_id: req.user.id,
      action: 'DELETE',
      entity_type: 'investment',
      entity_id: id,
      details: JSON.stringify({ deleted_investment: deletedInvestment }),
    });

      res.status(204).send();
  });

  app.get('/api/investments/summary', requireAuth, async (req: any, res) => {
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    const { where, params } = buildInvestmentWhere(req.query || {}); // Still need to convert 'where' to Data API filters
    const queryParams: Record<string, string> = {};

    if (req.query.month) queryParams.month = `eq.${req.query.month}`;
    if (req.query.year) queryParams.year = `eq.${req.query.year}`;
    if (req.query.startDate) queryParams.investment_date = `gte.${req.query.startDate}`;
    if (req.query.endDate) queryParams.investment_date_end = `lte.${req.query.endDate}`;
    if (req.query.doctor && req.query.doctor !== 'All Doctors') {
      queryParams['or'] = `(doctor_code.eq.${req.query.doctor},doctor_name.eq.${req.query.doctor})`;
    }

    // This will likely require a view or a custom RPC function in Neon to handle aggregation
    // For now, we fetch all, and aggregate in memory (not ideal for large datasets)
    const investments = await neonDataApiRequest('get', '/investments', {}, queryParams);
    const totalInvestments = investments.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
    const totalExpected = investments.reduce((sum: number, inv: any) => sum + Number(inv.expected_returns || 0), 0);
    const totalActual = investments.reduce((sum: number, inv: any) => sum + Number(inv.actual_returns || 0), 0);
    const roi = totalInvestments > 0 ? (totalActual / totalInvestments * 100) : 0;

      res.json({ 
      totalInvestments: Number(totalInvestments.toFixed(2)),
      totalExpected: Number(totalExpected.toFixed(2)),
      totalActual: Number(totalActual.toFixed(2)),
      roi: roi.toFixed(2),
    });
  });

  app.get('/api/investments/summary-by-month', requireAuth, async (req: any, res) => {
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    const { where, params } = buildInvestmentWhere(req.query || {}); // Still need to convert 'where' to Data API filters
    const queryParams: Record<string, string> = {};

    if (req.query.month) queryParams.month = `eq.${req.query.month}`;
    if (req.query.year) queryParams.year = `eq.${req.query.year}`;
    if (req.query.startDate) queryParams.investment_date = `gte.${req.query.startDate}`;
    if (req.query.endDate) queryParams.investment_date_end = `lte.${req.query.endDate}`;
    if (req.query.doctor && req.query.doctor !== 'All Doctors') {
      queryParams['or'] = `(doctor_code.eq.${req.query.doctor},doctor_name.eq.${req.query.doctor})`;
    }

    // This will likely require a view or a custom RPC function in Neon to handle aggregation
    // For now, we fetch all, and aggregate in memory (not ideal for large datasets)
    const investments = await neonDataApiRequest('get', '/investments', {}, queryParams);

    const monthlySummary = investments.reduce((acc: any, inv: any) => {
      const date = new Date(inv.investment_date);
      const ym = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!acc[ym]) {
        acc[ym] = { total_amount: 0, total_actual: 0 };
      }
      acc[ym].total_amount += Number(inv.amount);
      acc[ym].total_actual += Number(inv.actual_returns || 0);
      return acc;
    }, {});

    const sortedMonths = Object.keys(monthlySummary).sort();
    const labels = sortedMonths;
    const amounts = sortedMonths.map(ym => Number(monthlySummary[ym].total_amount.toFixed(2)));
    const actuals = sortedMonths.map(ym => Number(monthlySummary[ym].total_actual.toFixed(2)));

    res.json({ labels, amounts, actuals });
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
    // This will likely require custom RPC functions or views in Neon for efficient aggregation
    // For now, we perform multiple Data API calls and aggregate in memory (not ideal for large datasets)

    const investmentCountResult = await neonDataApiRequest('get', '/investments?count=exact');
    const investmentCount = investmentCountResult?.count || 0;

    // For distinct doctor count, we might need to fetch all investments and count distinct doctors locally
    const allInvestments = await neonDataApiRequest('get', '/investments');
    const doctorCodes = new Set(allInvestments.map((inv: any) => inv.doctor_code).filter(Boolean));
    const doctorCount = doctorCodes.size;

    const productCountResult = await neonDataApiRequest('get', '/products?count=exact');
    const productCount = productCountResult?.count || 0;

    const roiData = await neonDataApiRequest('get', '/investments?select=amount,actual_returns');
    const totalInvestmentsAmount = roiData.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
    const totalActualReturns = roiData.reduce((sum: number, inv: any) => sum + Number(inv.actual_returns || 0), 0);
    const roi = totalInvestmentsAmount > 0 ? (totalActualReturns / totalInvestmentsAmount * 100) : 0;
      
      res.json({
      totalInvestments: investmentCount,
      activeDoctors: doctorCount,
      products: productCount,
      roi: roi.toFixed(2)
    });
  });

  app.get('/api/investments/recent', requireAuth, async (req: any, res) => {
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
    const recentInvestments = await neonDataApiRequest('get', '/investments', {}, { limit: 10, order: 'created_at.desc' });
    res.json(recentInvestments);
  });

  // Bills
  app.get('/api/bills', requireAuth, async (req: any, res) => {
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    const bills = await neonDataApiRequest('get', '/bills', {}, { limit: 100, order: 'created_at.desc' });
    res.json(bills);
  });
  
  app.post('/api/bills', requireAuth, async (req: any, res) => {
    const { merchant, bill_date, total, items, raw_text, extracted } = req.body;
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
    const newBill = await neonDataApiRequest('post', '/bills', {
      merchant: merchant || null,
      bill_date: bill_date || null,
      total: total || 0,
      items: items || [],
      raw_text: raw_text || null,
      extracted: extracted || {},
      created_by: req.user.id,
    });
    if (newBill && newBill.length > 0) {
      res.json(newBill[0]);
    } else {
      throw new Error('Failed to create bill via Data API.');
    }
  });

  app.post('/api/logs', requireAuth, async (req: any, res) => {
    const { action, entity_type, entity_id, details } = req.body;
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
    const newLog = await neonDataApiRequest('post', '/activity_logs', {
      user_id: req.user.id,
      action,
      entity_type,
      entity_id: entity_id || null,
      details: details ? JSON.stringify(details) : null,
    });
    if (newLog && newLog.length > 0) {
      res.status(201).json({ ok: true, log: newLog[0] });
    } else {
      throw new Error('Failed to create log via Data API.');
    }
  });

  app.get('/api/logs', requireAuth, async (req: any, res) => {
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
    // This query needs a JOIN with the users table to get user_name.
    // Data API does not directly support JOINs in simple queries.
    // This will either require a VIEW in Neon or fetching users separately and joining in memory.
    const activityLogs = await neonDataApiRequest('get', '/activity_logs', {}, { limit: 100, order: 'created_at.desc' });

    // For now, fetch users separately and join in memory
    const userIds = [...new Set(activityLogs.map((log: any) => log.user_id))];
    let users: any[] = [];
    if (userIds.length > 0) {
      // Data API supports 'in' operator for filtering
      users = await neonDataApiRequest('get', '/users', { id: `in.(${userIds.join(',')})` }, { select: 'id,name' });
    }
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const logsWithUserNames = activityLogs.map((log: any) => ({
      ...log,
      user_name: userMap.get(log.user_id) || 'Unknown User',
    }));

    res.json(logsWithUserNames);
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

      // This part of the code will need to be refactored to use the Data API
      // For now, it will return an error as the Data API is not fully integrated
      // and the pg.Pool is removed.
      // Refactor to Data API
      const newPharmacy = await neonDataApiRequest('post', '/pharmacies', {
        name, city, address,
        product_with_count_given: JSON.stringify(product_with_count_given),
        date_given,
        current_stock_owns: JSON.stringify(current_stock_owns),
        due_date_amount,
        scheme_applied,
        created_by: req.user.id,
      });

      if (newPharmacy && newPharmacy.length > 0) {
        res.status(201).json(newPharmacy[0]);
      } else {
        throw new Error('Failed to create pharmacy via Data API.');
      }

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  app.get('/api/pharmacies', requireAuth, async (req: any, res) => {
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    const pharmacies = await neonDataApiRequest('get', '/pharmacies', {}, { order: 'created_at.desc' });
    res.json(pharmacies);
  });

  app.get('/api/pharmacies/:id', requireAuth, async (req: any, res) => {
    const { id } = req.params;
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
    const pharmacy = await neonDataApiRequest('get', '/pharmacies', { id: `eq.${id}` });
    if (pharmacy && pharmacy.length > 0) {
      res.json(pharmacy[0]);
    } else {
      res.status(404).send('Pharmacy not found');
    }
  });

  app.put('/api/pharmacies/:id', requireAuth, async (req: any, res, next) => {
    const { id } = req.params;
    try {
      // Use a partial schema for updates, allowing some fields to be optional
      const validatedData = pharmacySchema.partial().parse(req.body);

      // This part of the code will need to be refactored to use the Data API
      // For now, it will return an error as the Data API is not fully integrated
      // and the pg.Pool is removed.
      const updatePayload: any = {};
        for (const key in validatedData) {
          if (validatedData.hasOwnProperty(key)) {
            if (key === 'product_with_count_given' || key === 'current_stock_owns') {
            updatePayload[key] = JSON.stringify((validatedData as any)[key]);
            } else {
            updatePayload[key] = (validatedData as any)[key];
          }
        }
      }

      const updatedPharmacy = await neonDataApiRequest('put', '/pharmacies', updatePayload, { id: `eq.${id}` });

      if (updatedPharmacy && updatedPharmacy.length > 0) {
        res.json(updatedPharmacy[0]);
      } else {
        return res.status(404).send('Pharmacy not found');
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
    // This part of the code will need to be refactored to use the Data API
    // For now, it will return an error as the Data API is not fully integrated
    // and the pg.Pool is removed.
    // Refactor to Data API
    const checkResult = await neonDataApiRequest('get', '/pharmacies', { id: `eq.${id}` });
    if (!checkResult || checkResult.length === 0) return res.status(404).send('Pharmacy not found');

    await neonDataApiRequest('delete', '/pharmacies', {}, { id: `eq.${id}` });
      res.status(204).send();
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
