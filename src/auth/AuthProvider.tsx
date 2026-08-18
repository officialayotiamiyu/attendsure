import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Organization, OrganizationMembership, Profile } from '../types/app';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  membership: OrganizationMembership | null;
  organization: Organization | null;
  loading: boolean;
  refreshContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadContext(user: User | null) {
  if (!user) {
    return {
      profile: null,
      membership: null,
      organization: null
    };
  }

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle<Profile>(),
    supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle<OrganizationMembership>()
  ]);

  let organization: Organization | null = null;
  if (membership?.organization_id) {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', membership.organization_id)
      .maybeSingle<Organization>();
    organization = data ?? null;
  }

  return {
    profile: profile ?? null,
    membership: membership ?? null,
    organization
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<OrganizationMembership | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshContext = useCallback(async () => {
    setLoading(true);
    const currentUser = (await supabase.auth.getUser()).data.user ?? null;
    const currentSession = (await supabase.auth.getSession()).data.session ?? null;
    const details = await loadContext(currentUser);
    setUser(currentUser);
    setSession(currentSession);
    setProfile(details.profile);
    setMembership(details.membership);
    setOrganization(details.organization);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      const details = await loadContext(data.session?.user ?? null);
      if (!mounted) return;
      setProfile(details.profile);
      setMembership(details.membership);
      setOrganization(details.organization);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      const details = await loadContext(nextSession?.user ?? null);
      setProfile(details.profile);
      setMembership(details.membership);
      setOrganization(details.organization);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ session, user, profile, membership, organization, loading, refreshContext }),
    [session, user, profile, membership, organization, loading, refreshContext]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
