# Vercel Login Issue Fix

## Problem
The application is returning a 404 error when trying to POST to `/api/auth/login` on Vercel deployment.

## Root Cause
The Vercel configuration has incorrect routing setup. The current `vercel.json` has:
1. Redundant rewrite rules that may conflict
2. Missing proper function configuration for the API handler

## Solution

### 1. Update `vercel.json`
Replace the current `vercel.json` with:

```json
{
  "version": 2,
  "name": "healthcare-manager-monorepo",
  "functions": {
    "api/index.ts": {
      "memory": 1024,
      "maxDuration": 10,
      "runtime": "nodejs20.x"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    }
  ]
}
```

### 2. Update `api/index.ts`
Ensure the handler properly processes all API routes:

```typescript
// The handler should process all /api/* routes
export default async function handler(req: Request, res: Response) {
  // Remove any path manipulation that might interfere with routing
  // Let Express handle the routing internally
  
  // Set CORS headers
  const origin = req.headers.origin || req.headers.host;
  const allowedOrigins = ['https://aarez-mgnmt.vercel.app', 'http://localhost:5173'];
  
  if (origin && allowedOrigins.some(allowed => origin.includes(allowed))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://aarez-mgnmt.vercel.app');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const { handler } = await getApp();
    return await handler(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### 3. Environment Variables
Ensure these are set in Vercel dashboard:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `NODE_ENV` - Set to "production"
- `CORS_ORIGIN` - Set to "https://aarez-mgnmt.vercel.app"

## Testing Steps
1. Deploy changes to Vercel
2. Check `/api/health` endpoint first
3. Test login with valid credentials
4. Monitor Vercel function logs for any errors

## Additional Debugging
If issues persist:
1. Check Vercel function logs
2. Verify environment variables are set
3. Test API endpoints directly using curl or Postman