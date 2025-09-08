import serverless from 'serverless-http';
import { createApp } from './app.js';
import { Request, Response } from 'express'; // Import Request and Response types

let serverlessHandler;

console.log('Starting serverless function initialization');

try {
  console.log('Attempting to create Express app');
  const app = createApp();
  
  console.log('Wrapping app with serverless');
  serverlessHandler = serverless(app, {
    binary: ['*/*'], // Support binary responses
    // Add more configuration if needed
  });
  
  console.log('Serverless handler created successfully');
} catch (error: unknown) {
  console.error('CRITICAL: Serverless function initialization failed', error);
  
  serverlessHandler = (req: Request, res: Response) => {
    console.error('Fallback error handler called');
    res.status(500).json({ 
      error: 'Server initialization failed', 
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  };
}

// Diagnostic route to help troubleshoot
if (serverlessHandler && typeof serverlessHandler === 'function') {
  console.log('Serverless handler is a valid function');
} else {
  console.error('Serverless handler is NOT a valid function');
}

export default serverlessHandler;
