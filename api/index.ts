import serverless from 'serverless-http';
import { createApp } from './app.js';
import { Request, Response } from 'express'; // Import Request and Response types

let serverlessHandler;

console.log('[index.ts] Serverless handler initialization started.');
try {
  console.log('[index.ts] Calling createApp()...');
  const app = createApp();
  console.log('[index.ts] createApp() returned app instance.');
  serverlessHandler = serverless(app);
  console.log('[index.ts] serverless(app) executed successfully.');
} catch (error: unknown) { // Explicitly type error as unknown
  console.error('[index.ts] Failed to initialize serverless function:', error);
  serverlessHandler = (req: Request, res: Response) => { // Explicitly type req and res
    res.status(500).json({ 
      error: 'Server initialization failed', 
      details: (error as Error).message // Cast error to Error to access message
    });
  };
}

export default serverlessHandler;
