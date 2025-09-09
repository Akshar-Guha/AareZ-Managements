import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '@stackframe/react';

export function PrivateRoute() {
  const { user, isLoading } = useUser();
  console.log('useUser in PrivateRoute.tsx:', { user, isLoading });

  if (isLoading) {
    return <div>Loading authentication...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/sign-in" replace />;
}
