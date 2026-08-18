import { AppShell } from '../../components/layout/AppShell';

export function AdminLayout() {
  return (
    <AppShell
      title="Owner dashboard"
      navItems={[
        { to: '/admin', label: 'Dashboard' },
        { to: '/admin/staff', label: 'Staff' },
        { to: '/admin/attendance', label: 'Attendance' },
        { to: '/admin/qr', label: 'QR' },
        { to: '/admin/statistics', label: 'Statistics' },
        { to: '/admin/settings', label: 'Settings' }
      ]}
    />
  );
}
