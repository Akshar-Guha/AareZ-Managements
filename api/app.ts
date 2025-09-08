import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// import { Pool } from 'pg'; // Remove pg import

export function createApp() {
  const app = express();
  console.log('[createApp] Registering CORS middleware...');
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }));
  console.log('[createApp] CORS middleware registered.');
  console.log('[createApp] Registering express.json middleware...');
  app.use(express.json());
  console.log('[createApp] express.json middleware registered.');
  console.log('[createApp] Registering cookie-parser middleware...');
  app.use(cookieParser(process.env.JWT_SECRET || 'dev-secret-change-me')); // Use JWT_SECRET as a secret for cookie-parser
  console.log('[createApp] cookie-parser middleware registered.');
  // Health
  app.get('/api/health', (req, res) => {
    console.log('[API Health] Health endpoint hit.');
    res.json({ ok: true });
  });
  console.log('[createApp] Returning Express app.');
  return app;
}
