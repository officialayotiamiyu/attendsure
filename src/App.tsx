import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { RoleRoute } from './auth/RoleRoute';
import { useAuth } from './auth/AuthProvider';
import { LoadingScreen } from './components/common/LoadingScreen';
import { SignInPage } from './features/auth/SignInPage';
import { SignUpPage } from './features/auth/SignUpPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { CreateOrganizationPage } from './features/onboarding/CreateOrganizationPage';
import { AdminLayout } from './features/owner/AdminLayout';
import { AttendanceHistoryPage } from './features/owner/AttendanceHistoryPage';
import { OwnerDashboardPage } from './features/owner/DashboardPage';
import { QrPage } from './features/owner/QrPage';
import { SettingsPage } from './features/owner/SettingsPage';
import { StaffPage } from './features/owner/StaffPage';
import { StatisticsPage } from './features/owner/StatisticsPage';
import { StaffDashboardPage } from './features/staff/DashboardPage';
import { StaffHistoryPage } from './features/staff/HistoryPage';
import { StaffLayout } from './features/staff/StaffLayout';

function HomeRedirect() {
  const { loading, session, membership } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/auth/sign-in" replace />;
  if (!membership) return <Navigate to="/onboarding/create-organization" replace />;
  return <Navigate to={membership.role === 'OWNER' ? '/admin' : '/staff'} replace />;
}

function NotFound() {
  return (
    <div className="center-screen">
      <h1>Page not found</h1>
      <p className="muted">The page you requested does not exist.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/auth/sign-in" element={<SignInPage />} />
      <Route path="/auth/sign-up" element={<SignUpPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding/create-organization" element={<CreateOrganizationPage />} />

        <Route element={<RoleRoute allowedRoles={['OWNER']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<OwnerDashboardPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="attendance" element={<AttendanceHistoryPage />} />
            <Route path="qr" element={<QrPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allowedRoles={['STAFF']} />}>
          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<StaffDashboardPage />} />
            <Route path="history" element={<StaffHistoryPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
