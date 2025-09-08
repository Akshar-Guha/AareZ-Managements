import serverless from 'serverless-http';

import { createApp } from './app.ts';
import { Request, Response } from 'express'; // Import Request and Response types

let serverlessHandler;

try {
  const app = createApp();
  serverlessHandler = serverless(app);
} catch (error: unknown) { // Explicitly type error as unknown
  serverlessHandler = (req: Request, res: Response) => { // Explicitly type req and res
    res.status(500).json({ 
      error: 'Server initialization failed', 
      details: (error as Error).message // Cast error to Error to access message
    });
  };
}

export default serverlessHandler;
