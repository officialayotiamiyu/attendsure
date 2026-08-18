import { supabase } from '../lib/supabase';
import type { InvitationSummary, StaffProfile } from '../types/app';

export async function listStaff() {
  const { data, error } = await supabase
    .from('staff_directory')
    .select('*')
    .order('full_name', { ascending: true });
  if (error) throw error;
  return data as Array<StaffProfile & { full_name: string; email: string }>;
}

export async function inviteStaff(input: { email: string; jobTitle?: string; scheduledStartTime: string; scheduledEndTime: string }) {
  const { data, error } = await supabase.rpc('create_staff_invitation', {
    p_email: input.email,
    p_job_title: input.jobTitle ?? null,
    p_scheduled_start_time: input.scheduledStartTime,
    p_scheduled_end_time: input.scheduledEndTime
  });
  if (error) throw error;

  const result = data as { id: string; token: string; expires_at: string };
  return {
    id: result.id,
    expires_at: result.expires_at,
    email: input.email,
    invite_link: `${window.location.origin}/auth/sign-up?invite=${encodeURIComponent(result.token)}`
  } as InvitationSummary;
}

export async function updateStaffProfile(input: {
  staffUserId: string;
  jobTitle?: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  employmentStatus: 'ACTIVE' | 'INACTIVE';
}) {
  const { error } = await supabase.rpc('owner_update_staff_profile', {
    p_staff_user_id: input.staffUserId,
    p_job_title: input.jobTitle ?? null,
    p_scheduled_start_time: input.scheduledStartTime,
    p_scheduled_end_time: input.scheduledEndTime,
    p_employment_status: input.employmentStatus
  });
  if (error) throw error;
}

export async function acceptInvitation(token: string) {
  const { error } = await supabase.rpc('accept_staff_invitation', { p_token: token });
  if (error) throw error;
}
