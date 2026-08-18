import { statusLabels, statusTone } from '../../lib/constants';
import type { AttendanceStatus } from '../../types/app';

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  return <span className={`badge badge-${statusTone[status]}`}>{statusLabels[status]}</span>;
}
