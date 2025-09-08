# Manager App

This is a full-stack application built with TypeScript, React, Node.js, and Express.js, featuring a management dashboard with various functionalities.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, PostCSS
- **Backend**: Node.js, Express.js, TypeScript

## Features

### User Authentication
Handles user login and provides context for authentication status.
- `src/context/AuthContext.tsx`
- `src/pages/Login.tsx`
- `src/components/PrivateRoute.tsx`

### API Services
Provides functions for interacting with the backend API.
- `api/app-neon-backup.ts`
- `api/app.ts`
- `api/index.ts`
- `api-local/server.ts`
- `src/lib/api.ts`

### Navigation and Layout
Defines the application layout and navigation structure.
- `src/components/Layout.tsx`
- `src/constants/nav.ts`

### Dashboard & Analytics
Provides various dashboards for analytics, logging, and other management functionalities.
- `src/pages/Analytics.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/LoggingDashboard.tsx`
- `src/pages/MRDashboard.tsx`

### Inventory & Products Management
Manages inventory and product-related functionalities.
- `src/pages/Inventory.tsx`
- `src/pages/Products.tsx`

### Investments Management
Handles investment-related features.
- `src/pages/Investments.tsx`

### OCR Page
Provides functionality related to Optical Character Recognition.
- `src/pages/OCRPage.tsx`

### UI Components
Reusable UI components used throughout the application.
- `src/components/Field.tsx`
- `src/components/KebabMenu.tsx`
- `src/components/Modal.tsx`

### Logging Context
Provides a context for logging functionality within the application.
- `src/context/LogContext.tsx`
