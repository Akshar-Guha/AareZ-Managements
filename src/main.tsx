import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { StackProvider, StackTheme } from '@stackframe/react';
import { App } from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StackProvider publicProjectId={import.meta.env.NEXT_PUBLIC_STACK_PROJECT_ID}>
      <StackTheme>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StackTheme>
    </StackProvider>
  </React.StrictMode>,
);
