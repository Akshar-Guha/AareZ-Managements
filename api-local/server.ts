import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const port = process.env.PORT || 3100;

async function startServer() {
  // Log environment variables for debugging
  console.log('Environment Variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not Set');
  console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);

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
