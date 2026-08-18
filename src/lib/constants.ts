import type { AttendanceStatus, LatenessReasonCode } from '../types/app';

export const latenessReasonOptions: Array<{ value: LatenessReasonCode; label: string }> = [
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'TRAFFIC', label: 'Traffic' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'HEALTH', label: 'Health' },
  { value: 'WEATHER', label: 'Weather' },
  { value: 'OTHER', label: 'Other' }
];

export const statusLabels: Record<AttendanceStatus, string> = {
  NOT_YET_CLOCKED_IN: 'Not yet clocked in',
  EARLY: 'Early',
  ON_TIME: 'On time',
  LATE: 'Late',
  ABSENT: 'Absent',
  LEFT: 'Left',
  INCOMPLETE: 'Incomplete'
};

export const statusTone: Record<AttendanceStatus, 'neutral' | 'success' | 'warning' | 'danger'> = {
  NOT_YET_CLOCKED_IN: 'neutral',
  EARLY: 'success',
  ON_TIME: 'success',
  LATE: 'warning',
  ABSENT: 'danger',
  LEFT: 'neutral',
  INCOMPLETE: 'warning'
};
