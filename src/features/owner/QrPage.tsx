import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { QrCanvas } from '../../components/qr/QrCanvas';
import { formatDateTime } from '../../lib/time';
import { issueAttendanceQr } from '../../services/qr';
import { getFriendlyError } from '../../lib/errors';
import { useAuth } from '../../auth/AuthProvider';

export function QrPage() {
  const { organization } = useAuth();
  const mutation = useMutation({ mutationFn: issueAttendanceQr });

  useEffect(() => {
    mutation.mutate();
  }, []);

  return (
    <div className="stack-lg qr-page">
      <Card className="qr-card">
        <h2>Attendance QR</h2>
        <p className="muted">This QR stays active until you choose to refresh it manually.</p>
        {mutation.data ? <QrCanvas value={mutation.data.token} /> : <div className="qr-placeholder" />}
        <div className="qr-meta">
          <span>
            {mutation.data?.expires_at ? `Expires: ${formatDateTime(mutation.data.expires_at, organization?.timezone)}` : 'Generating QR…'}
          </span>
          <Button variant="secondary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Refreshing…' : 'Refresh now'}
          </Button>
        </div>
        {mutation.data ? <div className="alert alert-success">Current QR is active and ready for staff clock-ins.</div> : null}
        {mutation.error ? <div className="alert alert-danger">{getFriendlyError(mutation.error)}</div> : null}
      </Card>
      <Card>
        <h3>Operational notes</h3>
        <ul className="list">
          <li>Only active organization members can use the QR.</li>
          <li>Expired tokens are rejected server-side.</li>
          <li>Attendance events use authoritative database timestamps, not device time.</li>
        </ul>
      </Card>
    </div>
  );
}
