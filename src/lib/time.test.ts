import { describe, expect, it } from 'vitest';
import { formatMinutes, formatTime, formatTimeValue } from './time';

describe('time helpers', () => {
  it('formats minutes clearly', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(17)).toBe('17 min');
    expect(formatMinutes(125)).toBe('2h 5m');
  });

  it('formats time-only values without shifting them by timezone', () => {
    const expected = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date('1970-01-01T08:00:00'));

    expect(formatTimeValue('08:00:00')).toBe(expected);
    expect(formatTimeValue('08:00')).toBe(expected);
  });

  it('formats PostgreSQL time values safely for owner dashboard averages', () => {
    expect(() => formatTime('08:22:00.287662', 'Africa/Lagos')).not.toThrow();
    expect(formatTime('08:22:00.287662', 'Africa/Lagos')).toBe(formatTimeValue('08:22:00.287662'));
  });
});
