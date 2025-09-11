import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from '@/stores/useAuthStore';
import SignIn from './pages/SignIn';
import Layout from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Products from './pages/Products';
import Pharmacy from './pages/Pharmacy';
import Investments from './pages/Investments';
import Analytics from './pages/Analytics';
import MRDashboard from './pages/MRDashboard';
import LoggingDashboard from './pages/LoggingDashboard';
import OCRPage from './pages/OCRPage';

export function App() {
  const navigate = useNavigate();
  const { user, isLoading, checkAuth } = useAuth();
  
  console.group('App Component Initialization');
  console.log('Initial state:', { user, isLoading });
  console.log('Current pathname:', window.location.pathname);
  console.groupEnd();

  useEffect(() => {
    console.group('CheckAuth Effect');
    console.log('Calling checkAuth()');
    checkAuth()
      .then(() => console.log('CheckAuth completed successfully'))
      .catch((error) => {
        console.error('CheckAuth failed:', error);
      });
    console.groupEnd();
  }, [checkAuth]);

  useEffect(() => {
    console.group('Navigation Effect');
    console.log('Current state:', { user, isLoading });
    
    if (!isLoading) {
      if (!user) {
        console.log('No user found, navigating to sign-in');
        navigate('/sign-in');
      } else {
        console.log('User found, current location:', window.location.pathname);
        if (window.location.pathname === '/sign-in') {
          navigate('/');
        }
      }
    }
    console.groupEnd();
  }, [user, isLoading, navigate]);

  if (isLoading) {
    console.log('Rendering loading state');
    return <div>Loading...</div>;
  }

  console.log('Rendering main routes');
  return (
    <>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="products" element={<Products />} />
            <Route path="pharmacy" element={<Pharmacy />} />
            <Route path="investments" element={<Investments />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="mrdashboard" element={<MRDashboard />} />
            <Route path="logging" element={<LoggingDashboard />} />
            <Route path="ocr" element={<OCRPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
