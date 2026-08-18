export type MembershipRole = 'OWNER' | 'STAFF';
export type MembershipStatus = 'ACTIVE' | 'INACTIVE' | 'INVITED';
export type EmploymentStatus = 'ACTIVE' | 'INACTIVE';
export type AttendanceStatus =
  | 'NOT_YET_CLOCKED_IN'
  | 'EARLY'
  | 'ON_TIME'
  | 'LATE'
  | 'ABSENT'
  | 'LEFT'
  | 'INCOMPLETE';
export type LatenessReasonCode = 'TRANSPORT' | 'TRAFFIC' | 'PERSONAL' | 'FAMILY' | 'HEALTH' | 'WEATHER' | 'OTHER';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  business_type: string | null;
  timezone: string;
  absence_grace_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffProfile {
  id: string;
  organization_id: string;
  user_id: string;
  job_title: string | null;
  employment_status: EmploymentStatus;
  scheduled_start_time: string;
  scheduled_end_time: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface AttendanceRecord {
  id: string;
  organization_id: string;
  staff_user_id: string;
  attendance_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: AttendanceStatus;
  arrival_status: AttendanceStatus | null;
  late_minutes: number;
  lateness_reason_code: LatenessReasonCode | null;
  lateness_reason_text: string | null;
  created_at: string;
  updated_at: string;
  profile?: Pick<Profile, 'full_name' | 'email'>;
}

export interface NotificationItem {
  id: string;
  organization_id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface InvitationSummary {
  id: string;
  email: string;
  invite_link: string;
  expires_at: string;
}

export interface DashboardSummary {
  total_staff: number;
  present_count: number;
  currently_at_work_count: number;
  late_count: number;
  absent_count: number;
  not_yet_clocked_in_count: number;
  average_arrival_time: string | null;
  average_lateness_minutes: number | null;
}

export interface DashboardAttendanceRow {
  staff_user_id: string;
  full_name: string;
  job_title: string | null;
  scheduled_start_time: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  current_status: AttendanceStatus;
  late_minutes: number;
  lateness_reason_text: string | null;
  duration_minutes: number | null;
}

export interface OwnerDashboardPayload {
  summary: DashboardSummary;
  attendance_rows: DashboardAttendanceRow[];
  notifications_created: number;
}

export interface StaffDashboardPayload {
  profile_name: string;
  organization_name: string;
  today_date: string;
  timezone: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  status: AttendanceStatus;
  clock_in_time: string | null;
  clock_out_time: string | null;
  late_minutes: number;
  latest_notification?: NotificationItem | null;
}

export interface AttendanceStatsPayload {
  attendance_rate: number;
  on_time_rate: number;
  late_arrivals: number;
  average_late_minutes: number;
  absences: number;
  average_arrival_time: string | null;
  total_days: number;
}

export interface AuditLogEntry {
  id: string;
  organization_id: string;
  attendance_record_id: string | null;
  staff_user_id: string;
  action_type: string;
  actor_user_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}
