import { supabase } from '../lib/supabase';
import type { NotificationItem } from '../types/app';

export async function fetchNotifications() {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(15);
  if (error) throw error;
  return data as NotificationItem[];
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  if (error) throw error;
}
