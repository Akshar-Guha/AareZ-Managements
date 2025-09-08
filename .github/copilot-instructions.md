# Copilot Instructions for Aarez HealthCare Manager

**AI agents: Fix issues directly, do not ask for obvious details. Continue until the problem is solved.**

## Project Architecture
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
  - Entry: `src/main.tsx`
  - Routing: `src/App.tsx`
- **Backend/API:** Express, deployed as Vercel serverless functions (`api/` for Vercel, `api-local/` for local dev)
- **Database:** Neon Postgres via `@neondatabase/serverless` (`DATABASE_URL` in `.env`)
- **Auth:** Email/password, bcrypt, JWT httpOnly cookies (`src/context/AuthContext.tsx`)
- **OCR:** Tesseract.js client-side (`src/pages/OCRPage.tsx`)
- **Charts:** Chart.js for analytics/visuals
- **Logging:** Optional Grafana Loki integration (`src/context/LogContext.tsx`)

## Key Workflows
- **Local Development:**
  - Install: `npm install`
  - Start: `npm run dev` (Vite serves frontend, proxies `/api` to backend)
  - API: `/api/*` (proxied to port 3000 if running local Express)
- **Environment Setup:**
  - Copy `.env.example` to `.env`, fill `DATABASE_URL`, `JWT_SECRET`
  - For first deploy, set `MIGRATE_ON_START=true` to auto-create schema
- **Deployment:**
  - Vercel builds Vite app and deploys API as serverless functions
  - Set env vars in Vercel dashboard

## Patterns & Conventions
- **Context Providers:**
  - Auth: `src/context/AuthContext.tsx` (use `useAuth()`)
  - Logging: `src/context/LogContext.tsx` (use `useLog()`)
- **Pages:** All main features in `src/pages/` (Dashboard, Analytics, Investments, Products, OCRPage, Inventory, Login)
- **Components:** Shared UI in `src/components/`
- **API Layer:** `src/lib/api.ts` wraps fetch for GET/POST/PUT/DELETE
- **Error Handling:** API errors throw and are caught in UI, often displayed via `setError` in state
- **Schema Migration:** On first deploy, tables are auto-created if missing

## Integration Points
- **External:**
  - Neon Postgres (cloud DB)
  - Vercel (hosting, serverless API)
  - Tesseract.js (OCR)
  - Chart.js (visuals)
  - Grafana Loki (logging, optional)

## Examples
- **Add a new page:**
  - Create in `src/pages/`
  - Add route in `src/App.tsx`
- **Add API endpoint:**
  - Implement in `api/` (for Vercel) or `api-local/` (for local dev)
- **Use Auth:**
  ```tsx
  const { user, login, logout } = useAuth();
  ```
- **Log an event:**
  ```tsx
  const { addLog } = useLog();
  addLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Event', details: {} });
  ```
- **Integrate Loki logging:**
  - Set `NEXT_PUBLIC_LOKI_URL` in `.env.local` to your Loki endpoint
  - Logs are sent via `addLog` in `LogContext.tsx`

## Troubleshooting
- If API fails, check `.env` for correct DB credentials and JWT secret
- For local API, ensure Postgres is running and accessible
- For Vercel deploy, set all required env vars
- For logging, ensure Loki and Grafana are running and data source is configured

---
Update this file if major architecture or workflow changes are made.
