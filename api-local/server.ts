import dotenv from 'dotenv';
dotenv.config();

const port = 3100;

async function startServer() {
  // Dynamically import createApp and ensureSchema after dotenv.config()
  const { createApp } = await import('../api/app');
  const app = createApp();

  // Call ensureSchema to create tables and default user
  // await ensureSchema().catch(err => console.error('Migration error', err));
  
  // Run Knex migrations before starting the server
  const knex = (await import('knex')).default;
  const knexConfig = (await import('../knexfile')).default;
  const db = knex(knexConfig.development);

  try {
    console.log('Running database migrations...');
    await db.migrate.latest();
    console.log('Database migrations completed.');
  } catch (err) {
    console.error('Error during database migrations:', err);
    process.exit(1); // Exit if migrations fail
  } finally {
    await db.destroy(); // Close the Knex connection pool after migrations
  }

  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

startServer();
