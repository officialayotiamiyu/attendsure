import { formatInTimeZone } from 'date-fns-tz';

function coerceDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!trimmed.includes('T') && !trimmed.includes(' ') && trimmed.includes(':')) {
    return new Date(`1970-01-01T${trimmed}Z`);
  }

  const isoLike = trimmed.includes(' ') ? trimmed.replace(' ', 'T') : trimmed;
  const parsed = new Date(isoLike);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatTime(value: string | null | undefined, timezone = 'UTC', fallback = '—'): string {
  if (!value) return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  if (!trimmed.includes('T') && !trimmed.includes(' ') && trimmed.includes(':')) {
    return formatTimeValue(trimmed);
  }

  const date = coerceDate(trimmed);
  if (!date) return fallback;

  return formatInTimeZone(date, timezone, 'hh:mm a');
}

export function formatDate(value: string | null | undefined, timezone = 'UTC', fallback = '—'): string {
  if (!value) return fallback;
  const date = coerceDate(value);
  if (!date) return fallback;
  return formatInTimeZone(date, timezone, 'EEE, MMM d, yyyy');
}

export function formatDateTime(value: string | null | undefined, timezone = 'UTC', fallback = '—'): string {
  if (!value) return fallback;
  const date = coerceDate(value);
  if (!date) return fallback;
  return formatInTimeZone(date, timezone, 'MMM d, yyyy hh:mm a');
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes === 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remaining}m`;
  }
  return `${remaining} min`;
}

export function getTodayInTimezone(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
}

export function formatTimeValue(timeValue: string): string {
  const normalized = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
  const [hoursRaw, minutesRaw, secondsRaw = '0'] = normalized.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const seconds = Number(secondsRaw);
  const utcDate = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC'
  }).format(utcDate);
}
