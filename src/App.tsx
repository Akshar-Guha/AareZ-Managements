import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PrivateRoute } from '@/components/PrivateRoute';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Investments from '@/pages/Investments';
import Analytics from '@/pages/Analytics';
import Products from '@/pages/Products';
import OCRPage from '@/pages/OCRPage';
import Inventory from '@/pages/Inventory';
import { LogProvider } from '@/context/LogContext';
import LoggingDashboard from '@/pages/LoggingDashboard';
import MRDashboard from '@/pages/MRDashboard';
import Pharmacy from '@/pages/Pharmacy'; // Import the new Pharmacy component


function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen grid place-items-center">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute allowedRoles={['admin']} />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="investments" element={<Investments />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="products" element={<Products />} />
          <Route path="ocr" element={<OCRPage />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="logs" element={<LoggingDashboard />} />
          <Route path="pharmacies" element={<Pharmacy />} /> {/* Add the new Pharmacy route */}
        </Route>
      </Route>
      <Route element={<PrivateRoute allowedRoles={['mr']} />}>
        <Route path="/mr" element={<MRDashboard />} />
      </Route>
      <Route path="*" element={user ? (user.role === 'admin' ? <Navigate to="/dashboard" /> : <Navigate to="/mr" />) : <Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LogProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </LogProvider>
  );
}
