import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/stores/useAuthStore';

export function PrivateRoute() {
  const { user, isLoading } = useAuth();
  console.log('useAuth in PrivateRoute.tsx:', { user, isLoading });

  if (isLoading) {
    return <div>Loading authentication...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/sign-in" replace />;
}
