import { supabase } from '../lib/supabase';
import type { AttendanceRecord, AttendanceStatsPayload, AuditLogEntry, LatenessReasonCode, OwnerDashboardPayload, StaffDashboardPayload } from '../types/app';

export async function fetchOwnerDashboard(targetDate?: string) {
  const { data, error } = await supabase.rpc('get_owner_dashboard', {
    p_target_date: targetDate ?? null
  });
  if (error) throw error;
  return data as OwnerDashboardPayload;
}

export async function fetchOwnerAttendanceHistory(filters: {
  fromDate?: string;
  toDate?: string;
  staffUserId?: string;
  status?: string;
}) {
  let query = supabase.from('attendance_history_view').select('*').order('attendance_date', { ascending: false });
  if (filters.fromDate) query = query.gte('attendance_date', filters.fromDate);
  if (filters.toDate) query = query.lte('attendance_date', filters.toDate);
  if (filters.staffUserId) query = query.eq('staff_user_id', filters.staffUserId);
  if (filters.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) throw error;
  return data as AttendanceRecord[];
}

export async function fetchStats(fromDate: string, toDate: string) {
  const { data, error } = await supabase.rpc('get_owner_statistics', {
    p_from_date: fromDate,
    p_to_date: toDate
  });
  if (error) throw error;
  return data as AttendanceStatsPayload;
}

export async function fetchAuditLogs(limit = 5) {
  const { data, error } = await supabase
    .from('attendance_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as AuditLogEntry[];
}

export async function fetchStaffDashboard() {
  const { data, error } = await supabase.rpc('get_staff_dashboard');
  if (error) throw error;
  return data as StaffDashboardPayload;
}

export async function fetchStaffHistory() {
  const { data, error } = await supabase.from('staff_attendance_history_view').select('*').order('attendance_date', { ascending: false });
  if (error) throw error;
  return data as AttendanceRecord[];
}

export async function fetchStaffSummary() {
  const { data, error } = await supabase.rpc('get_staff_statistics');
  if (error) throw error;
  return data as AttendanceStatsPayload;
}

export async function previewClockIn(qrToken: string) {
  const { data, error } = await supabase.rpc('preview_clock_in', {
    p_qr_token: qrToken
  });
  if (error) throw error;
  return data as { status: string; late_minutes: number; required_reason: boolean; scheduled_start_time: string };
}

export async function submitClockIn(qrToken: string, reasonCode?: LatenessReasonCode, reasonText?: string) {
  const { data, error } = await supabase.rpc('submit_clock_in', {
    p_qr_token: qrToken,
    p_lateness_reason_code: reasonCode ?? null,
    p_lateness_reason_text: reasonText ?? null
  });
  if (error) throw error;
  return data as { status: string; clock_in_time: string; late_minutes: number };
}

export async function submitClockOut(qrToken: string) {
  const { data, error } = await supabase.rpc('submit_clock_out', {
    p_qr_token: qrToken
  });
  if (error) throw error;
  return data as { status: string; clock_out_time: string };
}
