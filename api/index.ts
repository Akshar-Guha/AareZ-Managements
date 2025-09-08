import serverless from 'serverless-http';
import { createApp } from './app.js';

let serverlessHandler;

try {
  const app = createApp();
  serverlessHandler = serverless(app);
} catch (error) {
  console.error('Failed to initialize serverless function:', error);
  serverlessHandler = (req, res) => {
    res.status(500).json({ 
      error: 'Server initialization failed', 
      details: error.message 
    });
  };
}

export default serverlessHandler;
