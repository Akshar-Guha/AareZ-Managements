import * as dotenv from 'dotenv';
import * as path from 'path';

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

const port = process.env.PORT || 3100;

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
