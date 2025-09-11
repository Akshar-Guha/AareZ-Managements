# Healthcare Manager Clone

This is a clone of a healthcare management application with features for managing investments, products, pharmacies, and more.

## Features
- User authentication and authorization
- Dashboard with stats and recent investments
- Product management
- Pharmacy tracking
- Investment tracking
- OCR for bills
- Analytics and logging

## Tech Stack
- Frontend: React with Vite, TypeScript, Tailwind CSS, React Router
- Backend: Express.js with PostgreSQL (Neon)
- Deployment: Vercel for serverless API and static hosting
- State Management: Zustand
- Other: Knex for migrations, JWT for auth

## Local Development

1. Copy `.env.example` to `.env` and fill in the values:
   ```
   DATABASE_URL="postgresql://<user>:<password>@<host>/<database>?sslmode=require"
   JWT_SECRET="replace-with-long-random-secret"
   MIGRATE_ON_START=true
   CORS_ORIGIN="http://localhost:5173"
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run migrations (if needed):
   ```
   npm run migrate:latest
   ```

4. Start the development server:
   ```
   npm run dev
   ```

The app will be available at http://localhost:5173.

## Deployment to Vercel

1. Push your code to a Git repository connected to Vercel.

2. In Vercel Project Settings > Environment Variables, add:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `JWT_SECRET`: A long random secret for JWT signing
   - `MIGRATE_ON_START`: `true` for the first deploy (to auto-create tables), then set to `false`

3. Set `CORS_ORIGIN` to your Vercel domain or `*` for production.

4. Deploy. The backend will auto-migrate on first start, and the frontend will serve as static SPA with API routes handled by serverless functions.

Default credentials for testing:
- Admin: admin@aarezhealth.com / admin123
- MR: mr@aarezhealth.com / mr123
- User: user1@aarezhealth.com / user123

## Monitoring
- Prometheus and Grafana for metrics (docker-compose up)
- Axiom for logging (optional, set AXIOM_TOKEN and AXIOM_ORG_ID)

## Scripts
- `npm run dev`: Start dev server with API and frontend concurrently
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Lint code
- Migration scripts: `npm run migrate:make`, `npm run migrate:latest`, `npm run migrate:rollback`

## Axiom Logging Setup Guide

### 1. Prerequisites
- Create an account at [Axiom](https://axiom.co)
- Have access to your project's Vercel deployment

### 2. Generate Axiom API Token
1. Log in to Axiom Dashboard
2. Navigate to Settings > Tokens
3. Create a new token with:
   - Ingest permissions
   - Query permissions
   - Dataset: 'aarez-mgnmt-logs'

### 3. Environment Configuration

#### Local Development
1. Create `.env.local` file in project root
2. Add the following:
   ```
   VITE_AXIOM_TOKEN=your_axiom_token_here
   VITE_AXIOM_DATASET=aarez-mgnmt-logs
   ```

#### Vercel Deployment
1. Go to Vercel Project Settings
2. Add environment variables:
   - `VITE_AXIOM_TOKEN`: Your Axiom API token
   - `VITE_AXIOM_DATASET`: 'aarez-mgnmt-logs'

### 4. Logging Usage Examples

#### Basic Logging
```typescript
import { axiomLogger } from './lib/axiomLogger';

// Info log
axiomLogger.info('User action', { 
  userId: '123', 
  action: 'login' 
});

// Error log
axiomLogger.error('Operation failed', { 
  errorCode: 'E500', 
  details: 'Detailed error information' 
});

// Debug log
axiomLogger.debug('Diagnostic info', { 
  context: 'development', 
  timestamp: new Date().toISOString() 
});
```

#### User Activity Tracking
```typescript
axiomLogger.trackUserActivity('user123', 'login', {
  ipAddress: '192.168.1.1',
  loginMethod: 'email'
});
```

### 5. Troubleshooting

#### Common Issues
- Verify API token permissions
- Check network connectivity
- Ensure environment variables are correctly set

#### Diagnostic Commands
- `npm run axiom:login`: Authenticate Axiom CLI
- `npm run axiom:dataset:list`: List available datasets
- `npm run axiom:query`: Run Axiom queries

### 6. Performance Considerations
- Logging is disabled if no token is provided
- Logs are queued and sent asynchronously
- Minimal performance impact in production

### 7. Security
- Never commit API tokens to version control
- Use environment-specific configurations
- Rotate tokens periodically
