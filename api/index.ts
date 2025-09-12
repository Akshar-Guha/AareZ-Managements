import express from 'express';
import serverless from 'serverless-http';
import type { Request, Response } from 'express';

let appInstance: ReturnType<typeof express> | null = null;
let serverlessHandler: any = null;

async function getApp() {
  if (!appInstance) {
    console.log('Initializing minimal Express app for Vercel function');
    const app = express();

    app.get('/api/simple-health', (req, res) => {
      console.log('Minimal health check endpoint hit');
      res.status(200).json({ status: 'OK', message: 'Minimal server is running.' });
    });

    appInstance = app;

    serverlessHandler = serverless(appInstance, {
      binary: ['image/png', 'image/jpeg', 'application/pdf', 'application/json']
    });
  }
  return { app: appInstance, handler: serverlessHandler };
}

export default async function handler(req: Request, res: Response) {
  console.log('Serverless function invoked:', req.method, req.url);

  // Handle OPTIONS preflight requests if needed
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Temporarily allow all origins
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  try {
    const { handler } = await getApp();
    res.setHeader('X-Powered-By', 'Aarez Healthcare Minimal Vercel Function');
    // Temporarily allow all origins for debugging
    res.setHeader('Access-Control-Allow-Origin', '*');
    return await handler(req, res);
  } catch (error) {
    console.error('Minimal serverless handler error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
