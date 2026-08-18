import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/common/Card';
import { InputField } from '../../components/common/InputField';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { StatCard } from '../../components/common/StatCard';
import { useAuth } from '../../auth/AuthProvider';
import { formatTime } from '../../lib/time';
import { fetchStats } from '../../services/attendance';

export function StatisticsPage() {
  const { organization } = useAuth();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [fromDate, setFromDate] = useState(today.slice(0, 8) + '01');
  const [toDate, setToDate] = useState(today);
  const query = useQuery({ queryKey: ['stats', fromDate, toDate], queryFn: () => fetchStats(fromDate, toDate) });

  if (query.isLoading) return <LoadingScreen />;
  const stats = query.data;
  if (!stats) return null;

  const dateRangeMessage =
    fromDate && toDate && fromDate <= toDate
      ? `Analyzing ${fromDate} to ${toDate}`
      : 'Select a valid date range';

  return (
    <div className="stack-lg">
      <Card>
        <div className="stack-sm">
          <div className="grid two-columns">
            <InputField label="From" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <InputField label="To" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
          <div className="alert">{dateRangeMessage}</div>
        </div>
      </Card>
      <section className="grid stats-grid">
        <StatCard label="Attendance rate" value={`${stats.attendance_rate}%`} />
        <StatCard label="On-time rate" value={`${stats.on_time_rate}%`} />
        <StatCard label="Late arrivals" value={stats.late_arrivals} />
        <StatCard label="Average late minutes" value={stats.average_late_minutes} />
        <StatCard label="Absences" value={stats.absences} />
        <StatCard label="Average arrival time" value={stats.average_arrival_time ? formatTime(stats.average_arrival_time, organization?.timezone) : '—'} />
        <StatCard label="Days analyzed" value={stats.total_days} />
      </section>
    </div>
  );
}
