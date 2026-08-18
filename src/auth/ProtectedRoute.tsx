import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { LoadingScreen } from '../components/common/LoadingScreen';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  return <Outlet />;
}
