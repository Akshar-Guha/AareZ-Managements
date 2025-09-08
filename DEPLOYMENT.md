# Deployment Guide for Healthcare Manager

This guide outlines the steps to deploy the Healthcare Manager application to Vercel, including setting up environment variables and understanding the CI/CD pipeline.

## 1. Prerequisites

Before you begin, ensure you have:

*   A Git repository (e.g., GitHub, GitLab, Bitbucket) with your project code.
*   A Vercel account ([vercel.com](https://vercel.com/)).
*   A Neon account (or any PostgreSQL-compatible database) for your `DATABASE_URL`.

## 2. Project Setup for Vercel

The project is configured for Vercel deployment with the `vercel.json` file in the root directory. This file instructs Vercel to:

*   Build the frontend static assets from the `dist` directory.
*   Deploy the backend API as serverless functions using `api/index.ts`.
*   Route all `/api/*` requests to the serverless functions.
*   Route all other requests to the frontend static assets.

## 3. Deployment Steps

### 3.1. Push to Git Repository

Ensure your project is pushed to a Git repository. If you haven't already, initialize a Git repository and push your code:

```bash
git init
git add .
git commit -m "Initial commit for Vercel deployment"
git branch -M main
git remote add origin <YOUR_REPOSITORY_URL>
git push -u origin main
```

### 3.2. Connect Git Repository to Vercel

1.  Go to [vercel.com](https://vercel.com/) and log in.
2.  Click on the "New Project" button.
3.  Select your Git provider (GitHub, GitLab, or Bitbucket) and import your project repository.
4.  Vercel will automatically detect the project settings from your `vercel.json` file. Confirm the settings and proceed.

### 3.3. Configure Environment Variables in Vercel

Critical environment variables for the backend must be configured in your Vercel project settings:

1.  In your Vercel project dashboard, navigate to the "Settings" tab.
2.  Go to "Environment Variables".
3.  Add the following environment variables:
    *   `JWT_SECRET`: A strong, random secret string for JWT token signing. You can generate one using a tool or simply create a long, complex string.
    *   `NEON_DATA_API_URL`: The base URL for your Neon Data API endpoint (e.g., `https://ep-round-wave-adqhnqr0.apirest.c-2.us-east-1.aws.neon.tech/neondb/rest/v1`).
    *   `NEON_API_KEY`: Your API key for authenticating with the Neon Data API. This can be generated in your Neon dashboard.

    *Make sure these variables are added for the `Production`, `Preview`, and `Development` environments if you want them to be available in all contexts.*

### 3.4. Run Database Migrations (One-time Setup)

Before your application can fully function, you need to apply the database schema. This is done using Knex.js migrations.

1.  **Obtain your `DATABASE_URL`:** From your Neon dashboard, get your traditional PostgreSQL connection string (starts with `postgresql://`). This is used by Knex for schema management, separate from the Data API.
2.  **Set `DATABASE_URL` locally:** Set this string as a `DATABASE_URL` environment variable in your local development environment (e.g., in a `.env` file).
3.  **Run Migrations:** In your project's root directory, execute the following command:
    ```bash
    npm run migrate:latest
    ```
    This will create all necessary tables and populate default user data in your Neon database.

## 4. CI/CD Pipeline

Vercel provides a seamless, built-in Continuous Integration/Continuous Deployment (CI/CD) pipeline. Once your project is connected to a Git repository, any new pushes to the connected branch (typically `main` or `master`) will automatically trigger a new build and deployment.

*   **Automatic Builds**: Vercel will detect changes in your repository, run the `build` command specified in `package.json` (which uses `vite build`), and then deploy the `dist` directory for the frontend and `api/index.ts` as serverless functions.
*   **Instant Previews**: For every pull request, Vercel can create a unique preview deployment, allowing you to review changes in a live environment before merging to `main`.
*   **Rollbacks**: Vercel keeps a history of your deployments, allowing you to easily roll back to a previous version if needed.

## 5. Maintenance Procedures

### 5.1. Database Migrations

When you make changes to your database schema (e.g., adding new tables or columns), you'll need to apply these migrations. Currently, `api/app.ts` contains an `ensureSchema()` function that creates tables if they don't exist. For production, consider a more robust migration system:

*   **Local Development**: Run `npm run dev:server` to trigger `ensureSchema` or manually connect to your local PostgreSQL database and apply changes.
*   **Production (Neon)**: For Neon, you can use a migration tool like `knex.js`, `TypeORM`, or `Prisma` to manage schema changes. These tools can be integrated into your CI/CD pipeline to automatically apply migrations before deployment, or you can run them manually against your Neon database.
    *   *Note: For simple schema changes, you might manually apply them through a database client or the Neon dashboard, but automated migrations are recommended for complex projects.*

### 5.2. Environment Variable Updates

If you need to change `JWT_SECRET`, `DATABASE_URL`, or add new environment variables, update them in your Vercel project settings under the "Environment Variables" section. After updating, Vercel will trigger a redeployment to ensure the new variables are used.

### 5.3. Monitoring and Logging

*   **Vercel Dashboard**: Monitor your deployments, view build logs, and check function logs directly from the Vercel dashboard.
*   **Activity Logs**: The application includes an `activity_logs` table (`/api/logs` endpoint) to record user actions. Regularly review these logs for insights into application usage and potential issues.
*   **Error Handling**: The backend includes a generic error handling middleware. Monitor your Vercel function logs for any unhandled errors to identify and address issues promptly.

### 5.4. Scaling

Vercel automatically scales your serverless functions and static assets to handle traffic. For the Neon PostgreSQL database, monitor your usage and upgrade your plan if necessary to ensure optimal performance as your application grows.

This concludes the deployment and maintenance guide.
