import { describe, expect, it } from 'vitest';
import { getFriendlyError } from './errors';

describe('getFriendlyError', () => {
  it('maps permission errors to a clear message', () => {
    expect(getFriendlyError(new Error('permission denied'))).toBe('You do not have permission to perform this action.');
  });

  it('maps late clock-in errors to a clear message', () => {
    expect(getFriendlyError(new Error('A lateness reason is required for late clock-ins.'))).toBe('A lateness reason is required for late clock-ins.');
  });

  it('maps invitation expiry errors to a clear message', () => {
    expect(getFriendlyError(new Error('Invitation has expired.'))).toBe('This invitation has expired.');
  });

  it('maps network errors to a clear message', () => {
    expect(getFriendlyError(new Error('Failed to fetch'))).toBe('Unable to reach the server. Please check your internet connection.');
  });
});
