import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { LoadingScreen } from '../components/common/LoadingScreen';

interface RoleRouteProps {
  allowedRoles: Array<'OWNER' | 'STAFF'>;
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { membership, loading, session } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/auth/sign-in" replace />;
  if (!membership) return <Navigate to="/onboarding/create-organization" replace />;
  if (!allowedRoles.includes(membership.role)) {
    return <Navigate to={membership.role === 'OWNER' ? '/admin' : '/staff'} replace />;
  }
  return <Outlet />;
}
