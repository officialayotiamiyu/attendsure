import { supabase } from '../lib/supabase';

export async function issueAttendanceQr() {
  const { data, error } = await supabase.rpc('issue_attendance_qr');
  if (error) throw error;
  return data as { token: string; expires_at: string };
}
