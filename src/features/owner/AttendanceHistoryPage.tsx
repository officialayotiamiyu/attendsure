import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { InputField, SelectField } from '../../components/common/InputField';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../auth/AuthProvider';
import { downloadCsv } from '../../lib/csv';
import { formatDate, formatTime, formatTimeValue } from '../../lib/time';
import { fetchOwnerAttendanceHistory } from '../../services/attendance';
import { listStaff } from '../../services/staff';
import type { AttendanceRecord } from '../../types/app';

export function AttendanceHistoryPage() {
  const { organization } = useAuth();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [filters, setFilters] = useState({ fromDate: today, toDate: today, staffUserId: '', status: '' });
  const historyQuery = useQuery({ queryKey: ['owner-attendance-history', filters], queryFn: () => fetchOwnerAttendanceHistory(filters) });
  const staffQuery = useQuery({ queryKey: ['staff'], queryFn: listStaff });

  if (historyQuery.isLoading) return <LoadingScreen />;
  const rows = (historyQuery.data ?? []) as Array<AttendanceRecord & { full_name?: string; email?: string }>;

  return (
    <div className="stack-lg">
      <Card>
        <div className="section-heading">
          <div>
            <h2>Attendance history</h2>
            <p className="muted">Filter by date range, employee, or attendance status.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv(
                `attendance-${filters.fromDate}-to-${filters.toDate}.csv`,
                rows.map((row) => ({
                  employee_name: row.full_name ?? '',
                  date: row.attendance_date ?? '',
                  scheduled_start: row.scheduled_start_time ?? '',
                  clock_in: row.clock_in_time ?? '',
                  clock_out: row.clock_out_time ?? '',
                  status: row.status ?? '',
                  late_minutes: Number(row.late_minutes ?? 0),
                  lateness_reason: row.lateness_reason_text ?? ''
                }))
              )
            }
            disabled={rows.length === 0}
          >
            Export CSV
          </Button>
        </div>
        <div className="grid filters-grid">
          <InputField label="From" type="date" value={filters.fromDate} onChange={(event) => setFilters((value) => ({ ...value, fromDate: event.target.value }))} />
          <InputField label="To" type="date" value={filters.toDate} onChange={(event) => setFilters((value) => ({ ...value, toDate: event.target.value }))} />
          <SelectField label="Employee" value={filters.staffUserId} onChange={(event) => setFilters((value) => ({ ...value, staffUserId: event.target.value }))}>
            <option value="">All staff</option>
            {(staffQuery.data ?? []).map((staff) => (
              <option key={staff.user_id} value={staff.user_id}>{staff.full_name}</option>
            ))}
          </SelectField>
          <SelectField label="Status" value={filters.status} onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value }))}>
            <option value="">All statuses</option>
            <option value="EARLY">Early</option>
            <option value="ON_TIME">On time</option>
            <option value="LATE">Late</option>
            <option value="ABSENT">Absent</option>
            <option value="LEFT">Left</option>
          </SelectField>
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No attendance records" description="Adjust filters or invite staff to start capturing attendance." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
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
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.full_name ?? 'Unknown'}</td>
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
