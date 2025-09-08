import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function PrivateRoute({ allowedRoles }: { allowedRoles: Array<'admin' | 'mr'> }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // If user's role is not allowed, redirect them
    if (user.role === 'mr') {
      return <Navigate to="/mr" replace />;
    }
    if (user.role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    // Fallback redirect for any other case
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
