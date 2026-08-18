import { supabase } from '../lib/supabase';
import type { Organization } from '../types/app';

export async function createOrganization(input: { name: string; businessType?: string; timezone: string; absenceGraceMinutes: number }) {
  const { data, error } = await supabase.rpc('create_organization', {
    p_name: input.name,
    p_business_type: input.businessType ?? null,
    p_timezone: input.timezone,
    p_absence_grace_minutes: input.absenceGraceMinutes
  });
  if (error) throw error;
  return data as string;
}

export async function updateOrganizationSettings(input: { organizationId: string; timezone: string; absenceGraceMinutes: number; businessType?: string }) {
  const { data, error } = await supabase
    .from('organizations')
    .update({
      timezone: input.timezone,
      absence_grace_minutes: input.absenceGraceMinutes,
      business_type: input.businessType ?? null
    })
    .eq('id', input.organizationId)
    .select('*')
    .single<Organization>();
  if (error) throw error;
  return data;
}
