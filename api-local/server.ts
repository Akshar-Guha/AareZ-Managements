import * as dotenv from 'dotenv';
import * as path from 'path';
import cors from 'cors';

// Load environment variables from multiple sources
const loadEnv = () => {
  const envFiles = [
    '.env.local',
    '.env'
  ];

  envFiles.forEach(file => {
    const result = dotenv.config({ 
      path: path.resolve(process.cwd(), file),
      override: true 
    });

    if (result.error && result.error.code !== 'ENOENT') {
      console.error(`Error loading ${file}:`, result.error);
    }
  });
};

loadEnv();

const port = process.env.PORT || 5174;

// Log all environment variables for debugging
console.group('Environment Variables');
Object.keys(process.env)
  .filter(key => key.startsWith('NODE_ENV') || 
                key.startsWith('DATABASE_') || 
                key.startsWith('JWT_') || 
                key.startsWith('CORS_') || 
                key.startsWith('MIGRATE_'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key]}`);
  });
console.groupEnd();

async function startServer() {
  // Dynamically import createApp and ensureSchema after dotenv.config()
  const { createApp } = await import('../api/app');
  const app = createApp();

  // Add CORS middleware with detailed logging
  const corsOptions = {
    origin: function(origin, callback) {
      console.log('CORS: Received Origin:', origin);
      console.log('CORS: Request Headers:', 
        origin ? 'Origin header present' : 'No origin header'
      );

      // Always allow requests from localhost on any port
      const allowedOrigins = [
        'http://localhost:5173', 
        'https://localhost:5173',
        'http://localhost:5174', 
        'https://localhost:5174',
        /^http:\/\/localhost:\d+$/,
        /^https:\/\/localhost:\d+$/
      ];

      if (!origin || allowedOrigins.some(allowed => 
        (typeof allowed === 'string' && allowed === origin) || 
        (allowed instanceof RegExp && allowed.test(origin))
      )) {
        console.log('CORS: Request ALLOWED');
        callback(null, true);
      } else {
        console.log('CORS: Request BLOCKED');
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'Accept', 
      'Origin', 
      'Cookie'
    ],
    credentials: true,
    optionsSuccessStatus: 200
  };

  // Use cors middleware with detailed options
  app.use(cors(corsOptions));

  // Additional logging middleware to help diagnose CORS issues
  app.use((req, res, next) => {
    console.log('Incoming Request Details:');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Origin Header:', req.get('Origin'));
    console.log('Referer Header:', req.get('Referer'));
    console.log('Host Header:', req.get('Host'));
    next();
  });

  // Run Knex migrations before starting the server
  const knex = (await import('knex')).default;
  const knexConfig = (await import('../knexfile')).default;
  
  console.log('Knex Configuration:', JSON.stringify(knexConfig.development, null, 2));

  const db = knex(knexConfig.development);

  try {
    console.log('Attempting to connect to database...');
    await db.raw('SELECT 1'); // Test database connection
    console.log('Database connection successful.');

    console.log('Running database migrations...');
    const migrationResult = await db.migrate.latest();
    console.log('Migrations completed. Result:', migrationResult);
  } catch (err) {
    console.error('Error during database connection or migrations:', err);
    process.exit(1); // Exit if migrations fail
  } finally {
    await db.destroy(); // Close the Knex connection pool after migrations
  }

  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

startServer();
