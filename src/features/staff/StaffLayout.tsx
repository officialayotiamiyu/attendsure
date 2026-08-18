import { AppShell } from '../../components/layout/AppShell';

export function StaffLayout() {
  return (
    <AppShell
      title="Staff dashboard"
      navItems={[
        { to: '/staff', label: 'Today' },
        { to: '/staff/history', label: 'History' }
      ]}
    />
  );
}
