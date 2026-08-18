import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { SelectField, TextAreaField } from '../../components/common/InputField';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QrScannerModal } from '../../components/qr/QrScannerModal';
import { latenessReasonOptions } from '../../lib/constants';
import { getFriendlyError } from '../../lib/errors';
import { formatDate, formatTime, formatTimeValue } from '../../lib/time';
import { fetchStaffDashboard, previewClockIn, submitClockIn, submitClockOut } from '../../services/attendance';

export function StaffDashboardPage() {
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({ queryKey: ['staff-dashboard'], queryFn: fetchStaffDashboard, refetchInterval: 30_000 });
  const [scannerMode, setScannerMode] = useState<'IN' | 'OUT' | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<{ status: string; late_minutes: number; required_reason: boolean } | null>(null);
  const [lateReasonCode, setLateReasonCode] = useState('TRANSPORT');
  const [lateReasonText, setLateReasonText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const clockInMutation = useMutation({
    mutationFn: (payload: { token: string; reasonCode?: typeof lateReasonCode; reasonText?: string }) =>
      submitClockIn(payload.token, payload.reasonCode as never, payload.reasonText),
    onSuccess: async (result) => {
      setPendingToken(null);
      setPreviewResult(null);
      setScannerMode(null);
      setLateReasonText('');
      setStatusMessage(`Clock-in recorded for ${formatTime(result.clock_in_time, dashboardQuery.data?.timezone ?? 'UTC')}.`);
      await queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['staff-history'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const previewMutation = useMutation({
    mutationFn: previewClockIn,
    onSuccess: async (result, token) => {
      if (result.required_reason) {
        setPendingToken(token);
        setPreviewResult(result);
        setStatusMessage(`Late arrival detected. Please provide a reason before clocking in.`);
        return;
      }
      setStatusMessage('QR accepted. Recording clock-in…');
      clockInMutation.mutate({ token });
    }
  });

  const clockOutMutation = useMutation({
    mutationFn: submitClockOut,
    onSuccess: async (result) => {
      setScannerMode(null);
      setStatusMessage(`Clock-out recorded for ${formatTime(result.clock_out_time, dashboardQuery.data?.timezone ?? 'UTC')}.`);
      await queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['staff-history'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const dashboard = dashboardQuery.data;
  const nextAction = dashboard?.clock_in_time
    ? dashboard.clock_out_time
      ? 'Shift completed'
      : 'Scan QR to clock out'
    : 'Scan QR to clock in';

  if (dashboardQuery.isLoading || !dashboard) return <LoadingScreen />;

  return (
    <div className="stack-lg">
      <Card className="staff-hero">
        <div>
          <p className="eyebrow">{dashboard.organization_name}</p>
          <h1>{dashboard.profile_name}</h1>
          <p className="muted">{formatDate(dashboard.today_date, dashboard.timezone)}</p>
        </div>
        <StatusBadge status={dashboard.status} />
      </Card>

      <section className="grid two-columns">
        <Card>
          <h2>Today's schedule</h2>
          <div className="stack-sm">
            <div className="inline-details"><span>Start</span><strong>{formatTimeValue(dashboard.scheduled_start_time)}</strong></div>
            <div className="inline-details"><span>End</span><strong>{formatTimeValue(dashboard.scheduled_end_time)}</strong></div>
            <div className="inline-details"><span>Clock in</span><strong>{formatTime(dashboard.clock_in_time, dashboard.timezone)}</strong></div>
            <div className="inline-details"><span>Clock out</span><strong>{formatTime(dashboard.clock_out_time, dashboard.timezone)}</strong></div>
            <div className="inline-details"><span>Late minutes</span><strong>{dashboard.late_minutes}</strong></div>
          </div>
        </Card>
        <Card>
          <h2>Attendance actions</h2>
          <p className="muted">Attendance requires an internet connection and a valid live QR code.</p>
          <div className="stack">
            <div className="alert">Current status: <strong>{dashboard.status}</strong> • Next step: <strong>{nextAction}</strong></div>
            <Button fullWidth onClick={() => setScannerMode('IN')} disabled={!!dashboard.clock_in_time || previewMutation.isPending}>I'm at work</Button>
            <Button variant="secondary" fullWidth onClick={() => setScannerMode('OUT')} disabled={!dashboard.clock_in_time || !!dashboard.clock_out_time}>Leaving</Button>
            {previewMutation.isPending ? <div className="alert">Validating QR token…</div> : null}
            {statusMessage ? <div className="alert alert-success">{statusMessage}</div> : null}
            {clockInMutation.data ? (
              <div className="alert alert-success">Clocked in at {formatTime(clockInMutation.data.clock_in_time, dashboard.timezone)} • {clockInMutation.data.late_minutes} minutes late</div>
            ) : null}
            {clockOutMutation.data ? <div className="alert alert-success">Clocked out at {formatTime(clockOutMutation.data.clock_out_time, dashboard.timezone)}</div> : null}
            {clockInMutation.error ? <div className="alert alert-danger">{getFriendlyError(clockInMutation.error)}</div> : null}
            {clockOutMutation.error ? <div className="alert alert-danger">{getFriendlyError(clockOutMutation.error)}</div> : null}
          </div>
        </Card>
      </section>

      {pendingToken ? (
        <Card>
          <h3>Lateness reason</h3>
          <p className="muted">Please provide a reason because this clock-in is after your scheduled start time. Current lateness: {previewResult?.late_minutes ?? 0} minutes.</p>
          <div className="stack">
            <SelectField label="Reason" value={lateReasonCode} onChange={(event) => setLateReasonCode(event.target.value)}>
              {latenessReasonOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </SelectField>
            <TextAreaField label="Explanation" value={lateReasonText} onChange={(event) => setLateReasonText(event.target.value)} placeholder="Optional additional details" />
            <Button onClick={() => clockInMutation.mutate({ token: pendingToken, reasonCode: lateReasonCode, reasonText: lateReasonText })} disabled={clockInMutation.isPending}>
              {clockInMutation.isPending ? 'Recording attendance…' : 'Submit clock-in'}
            </Button>
          </div>
        </Card>
      ) : null}

      <QrScannerModal
        open={scannerMode !== null}
        onClose={() => setScannerMode(null)}
        onScan={(token) => {
          if (scannerMode === 'IN') {
            setScannerMode(null);
            previewMutation.mutate(token);
          }
          if (scannerMode === 'OUT') {
            clockOutMutation.mutate(token);
            setScannerMode(null);
          }
        }}
      />
    </div>
  );
}
