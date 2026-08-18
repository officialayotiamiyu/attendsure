import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../auth/AuthProvider';
import { formatDate, formatTime, formatTimeValue } from '../../lib/time';
import { fetchStaffHistory, fetchStaffSummary } from '../../services/attendance';
import type { AttendanceRecord } from '../../types/app';

export function StaffHistoryPage() {
  const { organization } = useAuth();
  const historyQuery = useQuery({ queryKey: ['staff-history'], queryFn: fetchStaffHistory });
  const summaryQuery = useQuery({ queryKey: ['staff-summary'], queryFn: fetchStaffSummary });

  if (historyQuery.isLoading || summaryQuery.isLoading) return <LoadingScreen />;
  const history = (historyQuery.data ?? []) as Array<AttendanceRecord & { full_name?: string }>;
  const summary = summaryQuery.data;

  return (
    <div className="stack-lg">
      {summary ? (
        <section className="grid stats-grid">
          <StatCard label="Attendance rate" value={`${summary.attendance_rate}%`} />
          <StatCard label="On-time rate" value={`${summary.on_time_rate}%`} />
          <StatCard label="Late arrivals" value={summary.late_arrivals} />
          <StatCard label="Average late minutes" value={summary.average_late_minutes} />
          <StatCard label="Absences" value={summary.absences} />
        </section>
      ) : null}
      <Card>
        <h2>My attendance history</h2>
        {history.length === 0 ? (
          <EmptyState title="No attendance records" description="Your attendance history will appear here after your first successful clock-in." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Scheduled start</th>
                  <th>Clock in</th>
                  <th>Clock out</th>
                  <th>Status</th>
                  <th>Late minutes</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.attendance_date, organization?.timezone)}</td>
                    <td>{formatTimeValue(row.scheduled_start_time ?? '08:00')}</td>
                    <td>{formatTime(row.clock_in_time, organization?.timezone)}</td>
                    <td>{formatTime(row.clock_out_time, organization?.timezone)}</td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>{row.late_minutes}</td>
                    <td>{row.lateness_reason_text ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
