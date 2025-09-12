import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/stores/useAuthStore';

export function PrivateRoute() {
  const { user, isLoading } = useAuth();
  console.group('PrivateRoute Authentication Check');
  console.log('Current Authentication State:', { 
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    } : null, 
    isLoading 
  });

  if (isLoading) {
    console.log('PrivateRoute: Authentication is still loading');
    return <div>Loading authentication...</div>;
  }

  const isAuthorized = !!user;
  console.log('PrivateRoute Authorization:', { 
    isAuthorized, 
    willRedirect: !isAuthorized 
  });

  console.groupEnd();

  return isAuthorized ? <Outlet /> : <Navigate to="/sign-in" replace />;
}
