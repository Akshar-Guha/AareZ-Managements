import { createApp } from './app';
import type { Request, Response } from 'express';

// Initialize app once per runtime instance
let appInstance: ReturnType<typeof createApp> | null = null;

function getApp() {
  if (!appInstance) {
    console.log('Initializing Express app for Vercel function');
    appInstance = createApp();
  }
  return appInstance;
}

export default function handler(req: Request, res: Response) {
  const app = getApp();
  return (app as unknown as (req: Request, res: Response) => void)(req, res);
}
