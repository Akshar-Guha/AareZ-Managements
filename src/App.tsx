import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SignIn, useUser } from '@stackframe/react';
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
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/sign-in');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <div>Loading...</div>; // Or a more elaborate loading spinner
  }

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
