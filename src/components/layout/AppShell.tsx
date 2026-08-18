import { Link, NavLink, Outlet } from 'react-router-dom';
import { NotificationBell } from '../common/NotificationBell';
import { OfflineBanner } from '../common/OfflineBanner';
import { InstallPrompt } from '../common/InstallPrompt';
import { Button } from '../common/Button';
import { useAuth } from '../../auth/AuthProvider';
import { signOut } from '../../services/auth';

interface NavItem {
  to: string;
  label: string;
}

export function AppShell({ title, navItems }: { title: string; navItems: NavItem[] }) {
  const { profile, organization } = useAuth();

  return (
    <div className="app-shell">
      <OfflineBanner />
      <InstallPrompt />
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">A</span>
          <div>
            <strong>AttendSure</strong>
            <small>{organization?.name ?? title}</small>
          </div>
        </Link>
        <nav className="top-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} end>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-actions">
          <NotificationBell timezone={organization?.timezone} />
          <div className="user-chip">
            <strong>{profile?.full_name ?? 'User'}</strong>
            <small>{organization?.timezone ?? 'UTC'}</small>
          </div>
          <Button variant="ghost" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
