import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { StackProvider, StackTheme, StackClientApp } from '@stackframe/react';
import { App } from './App';
import './index.css';

const stackClientApp = new StackClientApp({
  publicProjectId: import.meta.env.VITE_NEXT_PUBLIC_STACK_PROJECT_ID as string,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StackTheme>
    </StackProvider>
  </React.StrictMode>,
);
