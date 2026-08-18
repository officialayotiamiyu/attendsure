import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useMarkNotificationRead, useNotifications } from '../../hooks/useNotifications';
import { formatDateTime } from '../../lib/time';
import { Card } from './Card';

export function NotificationBell({ timezone = 'UTC' }: { timezone?: string }) {
  const [open, setOpen] = useState(false);
  const { data = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const unreadCount = data.filter((item) => !item.is_read).length;

  return (
    <div className="notification-shell">
      <button className="icon-button" onClick={() => setOpen((value) => !value)} aria-label="Notifications">
        <Bell size={18} />
        {unreadCount > 0 ? <span className="notification-count">{unreadCount}</span> : null}
      </button>
      {open ? (
        <Card className="notification-panel">
          <div className="panel-header">
            <h3>Notifications</h3>
          </div>
          <div className="notification-list">
            {data.length === 0 ? <p className="muted">No notifications yet.</p> : null}
            {data.map((item) => (
              <button
                key={item.id}
                className={`notification-item ${item.is_read ? 'notification-read' : ''}`}
                onClick={() => markRead.mutate(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.message}</span>
                <small>{formatDateTime(item.created_at, timezone)}</small>
              </button>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
