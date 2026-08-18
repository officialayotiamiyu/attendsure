import { Card } from './Card';

export function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <Card className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {helper ? <span className="stat-helper">{helper}</span> : null}
    </Card>
  );
}
