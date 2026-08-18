import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { InputField, SelectField } from '../../components/common/InputField';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../auth/AuthProvider';
import { formatMinutes, formatDateTime, formatTime, formatTimeValue } from '../../lib/time';
import { fetchAuditLogs, fetchOwnerDashboard } from '../../services/attendance';

export function OwnerDashboardPage() {
  const { organization } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LATE' | 'PRESENT' | 'ABSENT' | 'NOT_YET_CLOCKED_IN'>('ALL');
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['owner-dashboard', selectedDate], queryFn: () => fetchOwnerDashboard(selectedDate) });
  const auditQuery = useQuery({ queryKey: ['owner-audit-logs'], queryFn: () => fetchAuditLogs(5) });

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!query.data) return [];
    return query.data.attendance_rows.filter((row) => {
      const matchesSearch = !term || [row.full_name, row.job_title ?? '', row.current_status].join(' ').toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PRESENT' && row.clock_in_time && !row.clock_out_time) ||
        (statusFilter === 'LATE' && row.current_status === 'LATE') ||
        (statusFilter === 'ABSENT' && row.current_status === 'ABSENT') ||
        (statusFilter === 'NOT_YET_CLOCKED_IN' && row.current_status === 'NOT_YET_CLOCKED_IN');
      return matchesSearch && matchesStatus;
    });
  }, [query.data, search, statusFilter]);

  if (query.isLoading) return <LoadingScreen />;
  const payload = query.data;
  if (!payload) return <EmptyState title="No dashboard data" description="Refresh the page to try again." />;

  return (
    <div className="stack-lg">
      <section className="grid stats-grid">
        <StatCard label="Total staff" value={payload.summary.total_staff} />
        <StatCard label="Present" value={payload.summary.present_count} />
        <StatCard label="Currently at work" value={payload.summary.currently_at_work_count} />
        <StatCard label="Late" value={payload.summary.late_count} />
        <StatCard label="Absent" value={payload.summary.absent_count} />
        <StatCard label="Not yet clocked in" value={payload.summary.not_yet_clocked_in_count} />
        <StatCard label="Average arrival time" value={payload.summary.average_arrival_time ? formatTime(payload.summary.average_arrival_time, organization?.timezone) : '—'} />
        <StatCard label="Average lateness" value={payload.summary.average_lateness_minutes ?? '—'} helper="minutes" />
      </section>

      <section className="grid two-columns">
        <Card>
          <div className="section-heading">
            <div>
              <h2>Today's attendance</h2>
              <p className="muted">Live operational overview across your organization.</p>
            </div>
          </div>
          <div className="stack-sm">
            <InputField label="Date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            <InputField label="Search staff" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or role" />
            <SelectField label="Status filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'LATE' | 'PRESENT' | 'ABSENT' | 'NOT_YET_CLOCKED_IN')}>
              <option value="ALL">All statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="NOT_YET_CLOCKED_IN">Not yet clocked in</option>
            </SelectField>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Scheduled start</th>
                  <th>Clock in</th>
                  <th>Clock out</th>
                  <th>Status</th>
                  <th>Late minutes</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((row) => (
                    <tr key={row.staff_user_id}>
                      <td>
                        <strong>{row.full_name}</strong>
                        <div className="muted">{row.job_title ?? 'Staff'}</div>
                      </td>
                      <td>{formatTimeValue(row.scheduled_start_time)}</td>
                      <td>{formatTime(row.clock_in_time, organization?.timezone)}</td>
                      <td>{formatTime(row.clock_out_time, organization?.timezone)}</td>
                      <td><StatusBadge status={row.current_status} /></td>
                      <td>{row.late_minutes}</td>
                      <td>{row.lateness_reason_text ?? '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState title="No matching records" description="Try another date or filter to view attendance." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="section-heading">
            <div>
              <h2>Currently at work</h2>
              <p className="muted">Staff who have clocked in and not clocked out yet.</p>
            </div>
          </div>
          <div className="stack">
            {payload.attendance_rows.filter((row) => row.clock_in_time && !row.clock_out_time).length === 0 ? (
              <EmptyState title="Nobody currently clocked in" description="Active shifts appear here automatically." />
            ) : (
              payload.attendance_rows
                .filter((row) => row.clock_in_time && !row.clock_out_time)
                .map((row) => (
                  <Card key={row.staff_user_id} className="inline-card">
                    <div>
                      <strong>{row.full_name}</strong>
                      <div className="muted">Clocked in {formatTime(row.clock_in_time, organization?.timezone)}</div>
                    </div>
                    <div className="inline-card-meta">
                      <StatusBadge status={row.current_status} />
                      <span>{formatMinutes(row.duration_minutes)}</span>
                    </div>
                  </Card>
                ))
            )}
          </div>
        </Card>
      </section>

      <Card>
        <div className="section-heading">
          <div>
            <h2>Recent activity</h2>
            <p className="muted">Latest attendance and staff actions logged in the system.</p>
          </div>
        </div>
        {auditQuery.isLoading ? (
          <LoadingScreen />
        ) : auditQuery.data && auditQuery.data.length ? (
          <div className="stack-sm">
            {auditQuery.data.map((entry) => (
              <div key={entry.id} className="inline-card">
                <div>
                  <strong>{entry.action_type.replace(/_/g, ' ').toLowerCase()}</strong>
                  <div className="muted">{entry.reason ?? 'No reason provided'}</div>
                </div>
                <small>{formatDateTime(entry.created_at, organization?.timezone)}</small>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No recent activity" description="Attendance events will appear here once staff start clocking in or out." />
        )}
      </Card>
    </div>
  );
}
