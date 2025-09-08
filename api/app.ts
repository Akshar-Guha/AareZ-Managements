import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// import { Pool } from 'pg'; // Remove pg import

export function createApp() {
  console.log('Starting createApp() function');
  console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not Set');

  const app = express();
  
  try {
    console.log('Configuring CORS middleware...');
    app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true
    }));
    console.log('CORS middleware configured successfully');

    console.log('Configuring JSON middleware...');
    app.use(express.json());
    console.log('JSON middleware configured successfully');

    console.log('Configuring cookie-parser middleware...');
    app.use(cookieParser(process.env.JWT_SECRET || 'dev-secret-change-me'));
    console.log('Cookie-parser middleware configured successfully');

    // Health
    console.log('Configuring health endpoint...');
    app.get('/api/health', (req, res) => {
      console.log('Health endpoint hit');
      res.json({ ok: true, timestamp: new Date().toISOString() });
    });
    console.log('Health endpoint configured successfully');

    console.log('createApp() completed successfully');
    return app;
  } catch (error) {
    console.error('Error in createApp():', error);
    throw error;
  }
}
