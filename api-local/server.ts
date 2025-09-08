import dotenv from 'dotenv';
dotenv.config();

const port = 3100;

async function startServer() {
  // Dynamically import createApp and ensureSchema after dotenv.config()
  const { createApp, ensureSchema } = await import('../api/app');
  const app = createApp();

  // Call ensureSchema to create tables and default user
  await ensureSchema().catch(err => console.error('Migration error', err));

  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

startServer();
