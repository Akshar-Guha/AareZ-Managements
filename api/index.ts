import serverless from 'serverless-http';
import { createApp } from './app.js';

try {
  const app = createApp();
  export default serverless(app);
} catch (error) {
  console.error('Failed to initialize serverless function:', error);
  export default (req, res) => {
    res.status(500).json({ 
      error: 'Server initialization failed', 
      details: error.message 
    });
  };
}
