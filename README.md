# Healthcare Manager

## Deployment to Vercel

### Prerequisites
- Vercel CLI installed (`npm install -g vercel`)
- Vercel account
- Environment variables prepared

### Deployment Steps

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Set Environment Variables**
   - Go to Vercel Project Settings
   - Add the following environment variables:
     - `DATABASE_URL`: Your Neon PostgreSQL connection string
     - `JWT_SECRET`: A secure random string
     - `AXIOM_TOKEN`: Axiom logging token
     - `AXIOM_ORG_ID`: Axiom organization ID
     - `AXIOM_DATASET`: Axiom dataset name
     - `NODE_ENV`: `production`
     - `VITE_API_BASE_URL`: `/api`

4. **Deploy**
   ```bash
   # For development deployment
   vercel

   # For production deployment
   vercel --prod
   ```

### Troubleshooting
- Ensure all environment variables are set correctly
- Check Vercel build logs for any errors
- Verify database migrations are running correctly

### Continuous Deployment
This project is configured with a Vercel build script that:
- Builds the frontend
- Runs database migrations
- Prepares the application for production deployment
