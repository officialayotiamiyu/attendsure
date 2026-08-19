import { describe, expect, it } from 'vitest';
import { resolveActiveMembership } from './AuthProvider';

describe('resolveActiveMembership', () => {
  it('prefers the OWNER membership when multiple active memberships exist', () => {
    const membership = resolveActiveMembership([
      { id: 'staff', role: 'STAFF', user_id: 'user-1', organization_id: 'org-staff', status: 'ACTIVE', created_at: '2024-01-01T00:00:00Z' },
      { id: 'owner', role: 'OWNER', user_id: 'user-1', organization_id: 'org-owner', status: 'ACTIVE', created_at: '2024-01-02T00:00:00Z' }
    ] as any);

    expect(membership?.role).toBe('OWNER');
    expect(membership?.organization_id).toBe('org-owner');
  });

  it('falls back to the earliest active membership when no OWNER row exists', () => {
    const membership = resolveActiveMembership([
      { id: 'second', role: 'STAFF', user_id: 'user-1', organization_id: 'org-2', status: 'ACTIVE', created_at: '2024-01-02T00:00:00Z' },
      { id: 'first', role: 'STAFF', user_id: 'user-1', organization_id: 'org-1', status: 'ACTIVE', created_at: '2024-01-01T00:00:00Z' }
    ] as any);

    expect(membership?.organization_id).toBe('org-2');
  });
});
