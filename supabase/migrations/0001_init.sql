begin;

create extension if not exists pgcrypto;

create type public.membership_role as enum ('OWNER', 'STAFF');
create type public.membership_status as enum ('ACTIVE', 'INACTIVE', 'INVITED');
create type public.employment_status as enum ('ACTIVE', 'INACTIVE');
create type public.attendance_status as enum ('NOT_YET_CLOCKED_IN', 'EARLY', 'ON_TIME', 'LATE', 'ABSENT', 'LEFT', 'INCOMPLETE');
create type public.lateness_reason_code as enum ('TRANSPORT', 'TRAFFIC', 'PERSONAL', 'FAMILY', 'HEALTH', 'WEATHER', 'OTHER');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone_number text,
  profile_photo_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text,
  timezone text not null,
  absence_grace_minutes integer not null default 60 check (absence_grace_minutes between 1 and 240),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'ACTIVE',
  joined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create unique index one_active_membership_per_user_idx
  on public.organization_members (user_id)
  where status = 'ACTIVE';

create table public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_title text,
  employment_status public.employment_status not null default 'ACTIVE',
  scheduled_start_time time not null,
  scheduled_end_time time not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id),
  check (scheduled_end_time <> scheduled_start_time)
);

create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  job_title text,
  scheduled_start_time time not null,
  scheduled_end_time time not null,
  expires_at timestamptz not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index unique_active_invite_email_per_org_idx
  on public.staff_invitations (organization_id, lower(email))
  where accepted_at is null;

create table public.attendance_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  token_hash text not null unique,
  issued_by uuid not null references public.profiles (id) on delete cascade,
  issued_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  staff_user_id uuid not null references public.profiles (id) on delete cascade,
  attendance_date date not null,
  scheduled_start_time time not null,
  scheduled_end_time time not null,
  clock_in_time timestamptz,
  clock_out_time timestamptz,
  status public.attendance_status not null,
  arrival_status public.attendance_status,
  late_minutes integer not null default 0 check (late_minutes >= 0),
  lateness_reason_code public.lateness_reason_code,
  lateness_reason_text text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, staff_user_id, attendance_date),
  check (clock_out_time is null or clock_in_time is not null),
  check (clock_out_time is null or clock_out_time >= clock_in_time)
);

create table public.qr_scan_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  token_id uuid references public.attendance_qr_tokens (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  action_type text not null,
  status text not null,
  message text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recipient_user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  source_ref text,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index notifications_source_ref_unique_idx
  on public.notifications (recipient_user_id, source_ref)
  where source_ref is not null;

create table public.attendance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  attendance_record_id uuid references public.attendance_records (id) on delete set null,
  staff_user_id uuid not null references public.profiles (id) on delete cascade,
  action_type text not null,
  actor_user_id uuid not null references public.profiles (id) on delete cascade,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger set_members_updated_at before update on public.organization_members for each row execute function public.set_updated_at();
create trigger set_staff_profiles_updated_at before update on public.staff_profiles for each row execute function public.set_updated_at();
create trigger set_invitations_updated_at before update on public.staff_invitations for each row execute function public.set_updated_at();
create trigger set_attendance_updated_at before update on public.attendance_records for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    lower(new.email)
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- FIX: backfill profiles for any auth.users rows that predate this trigger.
-- Root cause of the 409/23503 error: create_organization() inserts into
-- organization_members(user_id) with a FK to profiles(id). Any user who
-- signed up before on_auth_user_created existed has no profiles row, so
-- that insert fails the FK constraint. This backfill closes that gap and
-- should be run once after (re)creating the trigger, and again after any
-- environment restore/migration replay against an existing auth.users table.
-- ============================================================================
insert into public.profiles (id, full_name, email)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
       lower(u.email)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

create or replace function public.current_membership()
returns public.organization_members
language sql
stable
security definer
set search_path = public
as $$
  select om.*
  from public.organization_members om
  where om.user_id = auth.uid()
    and om.status = 'ACTIVE'
  order by case when om.role = 'OWNER' then 0 else 1 end,
           om.created_at asc
  limit 1;
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select (public.current_membership()).organization_id;
$$;

create or replace function public.is_owner_of(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.status = 'ACTIVE'
      and om.role = 'OWNER'
  );
$$;

create or replace function public.is_staff_of(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.status = 'ACTIVE'
  );
$$;

create or replace function public.log_scan_event(
  p_organization_id uuid,
  p_token_id uuid,
  p_action_type text,
  p_status text,
  p_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.qr_scan_events (organization_id, token_id, user_id, action_type, status, message)
  values (p_organization_id, p_token_id, auth.uid(), p_action_type, p_status, p_message);
end;
$$;

create or replace function public.create_notification(
  p_organization_id uuid,
  p_recipient_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_source_ref text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (organization_id, recipient_user_id, type, title, message, source_ref)
  values (p_organization_id, p_recipient_user_id, p_type, p_title, p_message, p_source_ref)
  on conflict (recipient_user_id, source_ref) where source_ref is not null do nothing;
end;
$$;

create or replace function public.assert_scan_rate_limit(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count integer;
begin
  select count(*)
    into v_recent_count
  from public.qr_scan_events
  where user_id = p_user_id
    and created_at >= timezone('utc', now()) - interval '60 seconds';

  if v_recent_count >= 20 then
    raise exception 'Too many attendance requests. Please wait a moment and try again.';
  end if;
end;
$$;

create or replace function public.calculate_attendance_status(
  p_now timestamptz,
  p_timezone text,
  p_scheduled_start time
)
returns table (status public.attendance_status, late_minutes integer)
language plpgsql
immutable
as $$
declare
  v_local_now timestamp;
  v_scheduled timestamp;
  v_diff integer;
begin
  v_local_now := timezone(p_timezone, p_now);
  v_scheduled := date_trunc('day', v_local_now) + p_scheduled_start;
  v_diff := greatest(floor(extract(epoch from (v_local_now - v_scheduled)) / 60)::integer, 0);

  if v_local_now < v_scheduled then
    status := 'EARLY';
    late_minutes := 0;
  elsif v_local_now = v_scheduled then
    status := 'ON_TIME';
    late_minutes := 0;
  elsif v_local_now > v_scheduled then
    status := 'LATE';
    late_minutes := v_diff;
  end if;

  return next;
end;
$$;

create or replace function public.sync_daily_absences(p_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
  v_local_now timestamp;
  v_today date;
  v_inserted_count integer := 0;
  v_inserted_ids uuid[];
  v_inserted_staff_ids uuid[];
  v_inserted_dates date[];
  v_owner record;
begin
  if not public.is_staff_of(p_organization_id) and not public.is_owner_of(p_organization_id) then
    raise exception 'You do not have permission to access this organization.';
  end if;

  select o.timezone into v_timezone
  from public.organizations o
  where o.id = p_organization_id;

  v_local_now := timezone(v_timezone, timezone('utc', now()));
  v_today := v_local_now::date;

  -- NOTE: 'inserted' below is a CTE, valid only within this single statement.
  -- Its rows are aggregated into arrays (v_inserted_*) so they can be reused
  -- in the notification loop and audit-log insert further down, which are
  -- separate statements where the CTE itself would no longer be visible.
  with candidates as (
    select sp.organization_id,
           sp.user_id,
           sp.scheduled_start_time,
           sp.scheduled_end_time,
           v_today as attendance_date,
           p.full_name,
           ((date_trunc('day', v_local_now) + sp.scheduled_start_time) + make_interval(mins => o.absence_grace_minutes)) as absence_at
    from public.staff_profiles sp
    join public.organizations o on o.id = sp.organization_id
    join public.profiles p on p.id = sp.user_id
    where sp.organization_id = p_organization_id
      and sp.employment_status = 'ACTIVE'
      and (date_trunc('day', v_local_now) + sp.scheduled_start_time) <= v_local_now
  ), inserted as (
    insert into public.attendance_records (
      organization_id,
      staff_user_id,
      attendance_date,
      scheduled_start_time,
      scheduled_end_time,
      status,
      arrival_status,
      late_minutes
    )
    select c.organization_id,
           c.user_id,
           c.attendance_date,
           c.scheduled_start_time,
           c.scheduled_end_time,
           'ABSENT'::public.attendance_status,
           'ABSENT'::public.attendance_status,
           0
    from candidates c
    where c.absence_at <= v_local_now
      and not exists (
        select 1 from public.attendance_records ar
        where ar.organization_id = c.organization_id
          and ar.staff_user_id = c.user_id
          and ar.attendance_date = c.attendance_date
      )
    returning id, staff_user_id, attendance_date
  )
  select coalesce(array_agg(id), '{}'),
         coalesce(array_agg(staff_user_id), '{}'),
         coalesce(array_agg(attendance_date), '{}'),
         count(*)
  into v_inserted_ids, v_inserted_staff_ids, v_inserted_dates, v_inserted_count
  from inserted;

  if v_inserted_count = 0 then
    return 0;
  end if;

  for v_owner in
    select om.user_id
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.role = 'OWNER'
      and om.status = 'ACTIVE'
  loop
    insert into public.notifications (organization_id, recipient_user_id, type, title, message, source_ref)
    select p_organization_id,
           v_owner.user_id,
           'ABSENCE_THRESHOLD',
           'Staff member absent',
           p.full_name || ' has not clocked in after the configured absence threshold.',
           'absence:' || p_organization_id::text || ':' || i.staff_user_id::text || ':' || i.attendance_date::text
    from unnest(v_inserted_staff_ids, v_inserted_dates) as i(staff_user_id, attendance_date)
    join public.profiles p on p.id = i.staff_user_id
    on conflict (recipient_user_id, source_ref) where source_ref is not null do nothing;
  end loop;

  insert into public.attendance_audit_logs (organization_id, attendance_record_id, staff_user_id, action_type, actor_user_id, new_values, reason)
  select p_organization_id,
         ar.id,
         ar.staff_user_id,
         'AUTO_ABSENCE',
         auth.uid(),
         to_jsonb(ar),
         'Automatic absence threshold reached.'
  from public.attendance_records ar
  where ar.id = any(v_inserted_ids);

  return v_inserted_count;
end;
$$;

create or replace function public.create_organization(
  p_name text,
  p_business_type text,
  p_timezone text,
  p_absence_grace_minutes integer default 60
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid() and om.status = 'ACTIVE'
  ) then
    raise exception 'Your account already belongs to an active organization.';
  end if;

  insert into public.organizations (name, business_type, timezone, absence_grace_minutes)
  values (trim(p_name), nullif(trim(coalesce(p_business_type, '')), ''), trim(p_timezone), p_absence_grace_minutes)
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role, status, joined_at)
  values (v_org_id, auth.uid(), 'OWNER', 'ACTIVE', timezone('utc', now()));

  return v_org_id;
end;
$$;

create or replace function public.create_staff_invitation(
  p_email text,
  p_job_title text,
  p_scheduled_start_time time,
  p_scheduled_end_time time
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.organization_members;
  v_org_id uuid;
  v_token text;
  v_expires_at timestamptz;
  v_existing_user uuid;
  v_invite_id uuid;
begin
  v_membership := public.current_membership();
  if v_membership.role <> 'OWNER' then
    raise exception 'Only organization owners can invite staff.';
  end if;

  v_org_id := v_membership.organization_id;

  select p.id into v_existing_user
  from public.profiles p
  where lower(p.email) = lower(trim(p_email));

  if v_existing_user is not null and exists (
    select 1 from public.organization_members om
    where om.user_id = v_existing_user and om.status = 'ACTIVE'
  ) then
    raise exception 'This user already belongs to an active organization.';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_expires_at := timezone('utc', now()) + interval '7 days';

  insert into public.staff_invitations (
    organization_id,
    email,
    token_hash,
    job_title,
    scheduled_start_time,
    scheduled_end_time,
    expires_at,
    created_by
  )
  values (
    v_org_id,
    lower(trim(p_email)),
    encode(digest(v_token, 'sha256'), 'hex'),
    nullif(trim(coalesce(p_job_title, '')), ''),
    p_scheduled_start_time,
    p_scheduled_end_time,
    v_expires_at,
    auth.uid()
  )
  returning id into v_invite_id;

  return jsonb_build_object(
    'id', v_invite_id,
    'token', v_token,
    'expires_at', v_expires_at
  );
end;
$$;

create or replace function public.accept_staff_invitation(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.staff_invitations;
  v_user_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid() and om.status = 'ACTIVE'
  ) then
    raise exception 'Your account already belongs to an active organization.';
  end if;

  select lower(email) into v_user_email
  from public.profiles
  where id = auth.uid();

  select * into v_invite
  from public.staff_invitations si
  where si.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and si.accepted_at is null
  limit 1;

  if not found then
    raise exception 'Invitation is invalid or has already been used.';
  end if;

  if v_invite.expires_at < timezone('utc', now()) then
    raise exception 'Invitation has expired.';
  end if;

  if v_user_email <> lower(v_invite.email) then
    raise exception 'This invitation was issued for a different email address.';
  end if;

  insert into public.organization_members (organization_id, user_id, role, status, joined_at)
  values (v_invite.organization_id, auth.uid(), 'STAFF', 'ACTIVE', timezone('utc', now()));

  insert into public.staff_profiles (
    organization_id,
    user_id,
    job_title,
    employment_status,
    scheduled_start_time,
    scheduled_end_time
  )
  values (
    v_invite.organization_id,
    auth.uid(),
    v_invite.job_title,
    'ACTIVE',
    v_invite.scheduled_start_time,
    v_invite.scheduled_end_time
  );

  update public.staff_invitations
  set accepted_at = timezone('utc', now()),
      accepted_by = auth.uid()
  where id = v_invite.id;

  perform public.create_notification(
    v_invite.organization_id,
    v_invite.created_by,
    'STAFF_JOINED',
    'Staff invitation accepted',
    v_user_email || ' joined the organization.',
    'invite:' || v_invite.id::text
  );
end;
$$;

create or replace function public.owner_update_staff_profile(
  p_staff_user_id uuid,
  p_job_title text,
  p_scheduled_start_time time,
  p_scheduled_end_time time,
  p_employment_status public.employment_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_old jsonb;
  v_new jsonb;
begin
  v_org_id := public.current_organization_id();
  if not public.is_owner_of(v_org_id) then
    raise exception 'Only organization owners can update staff profiles.';
  end if;

  select to_jsonb(sp) into v_old
  from public.staff_profiles sp
  where sp.organization_id = v_org_id
    and sp.user_id = p_staff_user_id;

  if v_old is null then
    raise exception 'Staff record not found.';
  end if;

  update public.staff_profiles
  set job_title = nullif(trim(coalesce(p_job_title, '')), ''),
      scheduled_start_time = p_scheduled_start_time,
      scheduled_end_time = p_scheduled_end_time,
      employment_status = p_employment_status
  where organization_id = v_org_id
    and user_id = p_staff_user_id;

  select to_jsonb(sp) into v_new
  from public.staff_profiles sp
  where sp.organization_id = v_org_id
    and sp.user_id = p_staff_user_id;

  insert into public.attendance_audit_logs (organization_id, staff_user_id, action_type, actor_user_id, old_values, new_values, reason)
  values (v_org_id, p_staff_user_id, 'STAFF_PROFILE_UPDATED', auth.uid(), v_old, v_new, 'Owner updated staff schedule or status.');
end;
$$;

create or replace function public.issue_attendance_qr()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_token text;
  v_expires_at timestamptz;
begin
  v_org_id := public.current_organization_id();
  if not public.is_owner_of(v_org_id) then
    raise exception 'Only organization owners can generate attendance QR codes.';
  end if;

  update public.attendance_qr_tokens
  set revoked_at = timezone('utc', now())
  where organization_id = v_org_id
    and revoked_at is null
    and expires_at > timezone('utc', now());

  v_token := encode(gen_random_bytes(24), 'hex');
  v_expires_at := timezone('utc', now()) + interval '45 seconds';

  insert into public.attendance_qr_tokens (organization_id, token_hash, issued_by, expires_at)
  values (v_org_id, encode(digest(v_token, 'sha256'), 'hex'), auth.uid(), v_expires_at);

  return jsonb_build_object('token', v_token, 'expires_at', v_expires_at);
end;
$$;

create or replace function public.resolve_valid_qr_token(p_qr_token text)
returns public.attendance_qr_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token public.attendance_qr_tokens;
begin
  select * into v_token
  from public.attendance_qr_tokens t
  where t.token_hash = encode(digest(p_qr_token, 'sha256'), 'hex')
    and t.revoked_at is null
    and t.expires_at >= timezone('utc', now())
  order by t.created_at desc
  limit 1;

  if not found then
    raise exception 'QR code is invalid or expired.';
  end if;

  return v_token;
end;
$$;

create or replace function public.preview_clock_in(p_qr_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token public.attendance_qr_tokens;
  v_org public.organizations;
  v_staff public.staff_profiles;
  v_result record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  perform public.assert_scan_rate_limit(auth.uid());
  v_token := public.resolve_valid_qr_token(p_qr_token);

  if not public.is_staff_of(v_token.organization_id) then
    perform public.log_scan_event(v_token.organization_id, v_token.id, 'PREVIEW_CLOCK_IN', 'DENIED', 'Organization mismatch.');
    raise exception 'You do not have permission to use this attendance QR code.';
  end if;

  select * into v_org from public.organizations where id = v_token.organization_id;
  select * into v_staff
  from public.staff_profiles sp
  where sp.organization_id = v_token.organization_id
    and sp.user_id = auth.uid()
    and sp.employment_status = 'ACTIVE';

  if not found then
    perform public.log_scan_event(v_token.organization_id, v_token.id, 'PREVIEW_CLOCK_IN', 'DENIED', 'Inactive or missing staff profile.');
    raise exception 'Your staff profile is inactive.';
  end if;

  select * into v_result
  from public.calculate_attendance_status(timezone('utc', now()), v_org.timezone, v_staff.scheduled_start_time);

  perform public.log_scan_event(v_token.organization_id, v_token.id, 'PREVIEW_CLOCK_IN', 'SUCCESS', 'Clock-in preview generated.');

  return jsonb_build_object(
    'status', v_result.status,
    'late_minutes', v_result.late_minutes,
    'required_reason', v_result.status = 'LATE',
    'scheduled_start_time', v_staff.scheduled_start_time
  );
end;
$$;

create or replace function public.submit_clock_in(
  p_qr_token text,
  p_lateness_reason_code public.lateness_reason_code default null,
  p_lateness_reason_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token public.attendance_qr_tokens;
  v_org public.organizations;
  v_staff public.staff_profiles;
  v_membership public.organization_members;
  v_existing public.attendance_records;
  v_status public.attendance_status;
  v_arrival_status public.attendance_status;
  v_late_minutes integer;
  v_now timestamptz := timezone('utc', now());
  v_local_date date;
  v_old jsonb;
  v_new jsonb;
  v_owner record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  perform public.assert_scan_rate_limit(auth.uid());
  v_token := public.resolve_valid_qr_token(p_qr_token);
  v_membership := public.current_membership();

  if v_membership.organization_id <> v_token.organization_id or v_membership.role <> 'STAFF' then
    perform public.log_scan_event(v_token.organization_id, v_token.id, 'CLOCK_IN', 'DENIED', 'Organization mismatch or invalid role.');
    raise exception 'You do not have permission to use this attendance QR code.';
  end if;

  select * into v_org from public.organizations where id = v_token.organization_id;
  select * into v_staff
  from public.staff_profiles sp
  where sp.organization_id = v_token.organization_id
    and sp.user_id = auth.uid()
    and sp.employment_status = 'ACTIVE'
  for update;

  if not found then
    perform public.log_scan_event(v_token.organization_id, v_token.id, 'CLOCK_IN', 'DENIED', 'Inactive or missing staff profile.');
    raise exception 'Your staff profile is inactive.';
  end if;

  v_local_date := timezone(v_org.timezone, v_now)::date;

  select status, late_minutes
    into v_arrival_status, v_late_minutes
  from public.calculate_attendance_status(v_now, v_org.timezone, v_staff.scheduled_start_time);

  if v_arrival_status = 'LATE' and p_lateness_reason_code is null then
    raise exception 'A lateness reason is required for late clock-ins.';
  end if;

  select * into v_existing
  from public.attendance_records ar
  where ar.organization_id = v_token.organization_id
    and ar.staff_user_id = auth.uid()
    and ar.attendance_date = v_local_date
  for update;

  if found and v_existing.clock_in_time is not null then
    perform public.log_scan_event(v_token.organization_id, v_token.id, 'CLOCK_IN', 'DENIED', 'Duplicate clock-in attempt.');
    raise exception 'You have already clocked in for this attendance period.';
  end if;

  if found then
    v_old := to_jsonb(v_existing);
    update public.attendance_records
    set clock_in_time = v_now,
        status = v_arrival_status,
        arrival_status = v_arrival_status,
        late_minutes = v_late_minutes,
        lateness_reason_code = p_lateness_reason_code,
        lateness_reason_text = nullif(trim(coalesce(p_lateness_reason_text, '')), '')
    where id = v_existing.id;
  else
    insert into public.attendance_records (
      organization_id,
      staff_user_id,
      attendance_date,
      scheduled_start_time,
      scheduled_end_time,
      clock_in_time,
      status,
      arrival_status,
      late_minutes,
      lateness_reason_code,
      lateness_reason_text
    ) values (
      v_token.organization_id,
      auth.uid(),
      v_local_date,
      v_staff.scheduled_start_time,
      v_staff.scheduled_end_time,
      v_now,
      v_arrival_status,
      v_arrival_status,
      v_late_minutes,
      p_lateness_reason_code,
      nullif(trim(coalesce(p_lateness_reason_text, '')), '')
    ) returning * into v_existing;
  end if;

  select * into v_existing from public.attendance_records where organization_id = v_token.organization_id and staff_user_id = auth.uid() and attendance_date = v_local_date;
  v_new := to_jsonb(v_existing);

  insert into public.attendance_audit_logs (organization_id, attendance_record_id, staff_user_id, action_type, actor_user_id, old_values, new_values, reason)
  values (v_token.organization_id, v_existing.id, auth.uid(), 'CLOCK_IN', auth.uid(), v_old, v_new, 'Staff clock-in.');

  perform public.create_notification(
    v_token.organization_id,
    auth.uid(),
    'CLOCK_IN_SUCCESS',
    'Clock-in recorded',
    'Clocked in successfully at ' || to_char(timezone(v_org.timezone, v_now), 'HH12:MI AM'),
    'clock-in:' || v_existing.id::text || ':' || auth.uid()::text
  );

  for v_owner in
    select om.user_id
    from public.organization_members om
    where om.organization_id = v_token.organization_id
      and om.role = 'OWNER'
      and om.status = 'ACTIVE'
  loop
    perform public.create_notification(
      v_token.organization_id,
      v_owner.user_id,
      case when v_arrival_status = 'LATE' then 'STAFF_LATE_CLOCK_IN' else 'STAFF_CLOCK_IN' end,
      case when v_arrival_status = 'LATE' then 'Late clock-in alert' else 'Staff clocked in' end,
      (select full_name from public.profiles where id = auth.uid()) ||
      case when v_arrival_status = 'LATE'
        then ' clocked in ' || v_late_minutes || ' minutes late.'
        else ' clocked in successfully.'
      end,
      'owner-clock-in:' || v_existing.id::text || ':' || v_owner.user_id::text
    );
  end loop;

  perform public.log_scan_event(v_token.organization_id, v_token.id, 'CLOCK_IN', 'SUCCESS', 'Clock-in recorded.');

  return jsonb_build_object(
    'status', v_existing.status,
    'clock_in_time', v_existing.clock_in_time,
    'late_minutes', v_existing.late_minutes
  );
end;
$$;

create or replace function public.submit_clock_out(p_qr_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token public.attendance_qr_tokens;
  v_org public.organizations;
  v_membership public.organization_members;
  v_record public.attendance_records;
  v_now timestamptz := timezone('utc', now());
  v_today date;
  v_old jsonb;
  v_owner record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  perform public.assert_scan_rate_limit(auth.uid());
  v_token := public.resolve_valid_qr_token(p_qr_token);
  v_membership := public.current_membership();

  if v_membership.organization_id <> v_token.organization_id or v_membership.role <> 'STAFF' then
    perform public.log_scan_event(v_token.organization_id, v_token.id, 'CLOCK_OUT', 'DENIED', 'Organization mismatch or invalid role.');
    raise exception 'You do not have permission to use this attendance QR code.';
  end if;

  select * into v_org from public.organizations where id = v_token.organization_id;
  v_today := timezone(v_org.timezone, v_now)::date;

  select * into v_record
  from public.attendance_records ar
  where ar.organization_id = v_token.organization_id
    and ar.staff_user_id = auth.uid()
    and ar.attendance_date = v_today
  for update;

  if not found or v_record.clock_in_time is null then
    perform public.log_scan_event(v_token.organization_id, v_token.id, 'CLOCK_OUT', 'DENIED', 'No active clock-in found.');
    raise exception 'You cannot clock out before clocking in.';
  end if;

  if v_record.clock_out_time is not null then
    perform public.log_scan_event(v_token.organization_id, v_token.id, 'CLOCK_OUT', 'DENIED', 'Duplicate clock-out attempt.');
    raise exception 'You have already clocked out for this attendance period.';
  end if;

  v_old := to_jsonb(v_record);

  update public.attendance_records
  set clock_out_time = v_now,
      status = 'LEFT'
  where id = v_record.id
  returning * into v_record;

  insert into public.attendance_audit_logs (organization_id, attendance_record_id, staff_user_id, action_type, actor_user_id, old_values, new_values, reason)
  values (v_token.organization_id, v_record.id, auth.uid(), 'CLOCK_OUT', auth.uid(), v_old, to_jsonb(v_record), 'Staff clock-out.');

  perform public.create_notification(
    v_token.organization_id,
    auth.uid(),
    'CLOCK_OUT_SUCCESS',
    'Clock-out recorded',
    'Clocked out successfully at ' || to_char(timezone(v_org.timezone, v_now), 'HH12:MI AM'),
    'clock-out:' || v_record.id::text || ':' || auth.uid()::text
  );

  for v_owner in
    select om.user_id
    from public.organization_members om
    where om.organization_id = v_token.organization_id
      and om.role = 'OWNER'
      and om.status = 'ACTIVE'
  loop
    perform public.create_notification(
      v_token.organization_id,
      v_owner.user_id,
      'STAFF_CLOCK_OUT',
      'Staff clocked out',
      (select full_name from public.profiles where id = auth.uid()) || ' has clocked out.',
      'owner-clock-out:' || v_record.id::text || ':' || v_owner.user_id::text
    );
  end loop;

  perform public.log_scan_event(v_token.organization_id, v_token.id, 'CLOCK_OUT', 'SUCCESS', 'Clock-out recorded.');

  return jsonb_build_object(
    'status', v_record.status,
    'clock_out_time', v_record.clock_out_time
  );
end;
$$;

create or replace function public.get_owner_dashboard(p_target_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_org public.organizations;
  v_target_date date;
  v_notifications_created integer := 0;
  v_average_arrival time;
  v_average_lateness numeric;
  v_total_staff integer;
  v_present integer;
  v_current integer;
  v_late integer;
  v_absent integer;
  v_not_clocked integer;
  v_rows jsonb;
begin
  v_org_id := public.current_organization_id();
  if not public.is_owner_of(v_org_id) then
    raise exception 'Only organization owners can view this dashboard.';
  end if;

  select * into v_org from public.organizations where id = v_org_id;
  perform public.sync_daily_absences(v_org_id);
  v_target_date := coalesce(p_target_date, timezone(v_org.timezone, timezone('utc', now()))::date);

  with today_rows as (
    select sp.user_id as staff_user_id,
           p.full_name,
           sp.job_title,
           sp.scheduled_start_time,
           ar.clock_in_time,
           ar.clock_out_time,
           coalesce(ar.status,
             case
               when (date_trunc('day', timezone(v_org.timezone, timezone('utc', now()))) + sp.scheduled_start_time + make_interval(mins => v_org.absence_grace_minutes)) <= timezone(v_org.timezone, timezone('utc', now())) then 'ABSENT'::public.attendance_status
               else 'NOT_YET_CLOCKED_IN'::public.attendance_status
             end) as current_status,
           coalesce(ar.late_minutes, 0) as late_minutes,
           ar.lateness_reason_text,
           case when ar.clock_in_time is not null and ar.clock_out_time is null
             then floor(extract(epoch from (timezone('utc', now()) - ar.clock_in_time)) / 60)::integer
             else null end as duration_minutes,
           ar.arrival_status
    from public.staff_profiles sp
    join public.profiles p on p.id = sp.user_id
    left join public.attendance_records ar
      on ar.organization_id = sp.organization_id
     and ar.staff_user_id = sp.user_id
     and ar.attendance_date = v_target_date
    where sp.organization_id = v_org_id
      and sp.employment_status = 'ACTIVE'
  )
  select count(*),
         count(*) filter (where clock_in_time is not null),
         count(*) filter (where clock_in_time is not null and clock_out_time is null),
         count(*) filter (where coalesce(arrival_status, current_status) = 'LATE'),
         count(*) filter (where current_status = 'ABSENT'),
         count(*) filter (where current_status = 'NOT_YET_CLOCKED_IN')
  into v_total_staff, v_present, v_current, v_late, v_absent, v_not_clocked
  from today_rows;

  select to_timestamp(avg(extract(epoch from timezone(v_org.timezone, clock_in_time))))::time,
         avg(nullif(late_minutes, 0))
    into v_average_arrival, v_average_lateness
  from public.attendance_records
  where organization_id = v_org_id
    and attendance_date = v_target_date
    and clock_in_time is not null;

  select coalesce(jsonb_agg(jsonb_build_object(
    'staff_user_id', staff_user_id,
    'full_name', full_name,
    'job_title', job_title,
    'scheduled_start_time', scheduled_start_time,
    'clock_in_time', clock_in_time,
    'clock_out_time', clock_out_time,
    'current_status', current_status,
    'late_minutes', late_minutes,
    'lateness_reason_text', lateness_reason_text,
    'duration_minutes', duration_minutes
  ) order by full_name), '[]'::jsonb)
  into v_rows
  from (
    select *
    from (
      select sp.user_id as staff_user_id,
             p.full_name,
             sp.job_title,
             sp.scheduled_start_time,
             ar.clock_in_time,
             ar.clock_out_time,
             coalesce(ar.status,
               case
                 when (date_trunc('day', timezone(v_org.timezone, timezone('utc', now()))) + sp.scheduled_start_time + make_interval(mins => v_org.absence_grace_minutes)) <= timezone(v_org.timezone, timezone('utc', now())) then 'ABSENT'::public.attendance_status
                 else 'NOT_YET_CLOCKED_IN'::public.attendance_status
               end) as current_status,
             coalesce(ar.late_minutes, 0) as late_minutes,
             ar.lateness_reason_text,
             case when ar.clock_in_time is not null and ar.clock_out_time is null
               then floor(extract(epoch from (timezone('utc', now()) - ar.clock_in_time)) / 60)::integer
               else null end as duration_minutes
      from public.staff_profiles sp
      join public.profiles p on p.id = sp.user_id
      left join public.attendance_records ar
        on ar.organization_id = sp.organization_id
       and ar.staff_user_id = sp.user_id
       and ar.attendance_date = v_target_date
      where sp.organization_id = v_org_id
        and sp.employment_status = 'ACTIVE'
    ) x
  ) q;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'total_staff', v_total_staff,
      'present_count', v_present,
      'currently_at_work_count', v_current,
      'late_count', v_late,
      'absent_count', v_absent,
      'not_yet_clocked_in_count', v_not_clocked,
      'average_arrival_time', v_average_arrival,
      'average_lateness_minutes', round(coalesce(v_average_lateness, 0), 0)
    ),
    'attendance_rows', v_rows,
    'notifications_created', v_notifications_created
  );
end;
$$;

create or replace function public.get_owner_statistics(p_from_date date, p_to_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_org public.organizations;
  v_attendance_rate numeric;
  v_on_time_rate numeric;
  v_late_arrivals integer;
  v_average_late numeric;
  v_absences integer;
  v_average_arrival time;
  v_total_days integer;
begin
  v_org_id := public.current_organization_id();
  if not public.is_owner_of(v_org_id) then
    raise exception 'Only organization owners can view statistics.';
  end if;

  select * into v_org from public.organizations where id = v_org_id;
  perform public.sync_daily_absences(v_org_id);

  with base as (
    select ar.*
    from public.attendance_records ar
    where ar.organization_id = v_org_id
      and ar.attendance_date between p_from_date and p_to_date
  ), eligible_staff as (
    select count(*) as count
    from public.staff_profiles sp
    where sp.organization_id = v_org_id
      and sp.employment_status = 'ACTIVE'
  )
  select case when es.count = 0 or (p_to_date - p_from_date + 1) <= 0 then 0
              else round((count(*) filter (where b.clock_in_time is not null)::numeric / (es.count * (p_to_date - p_from_date + 1))) * 100, 2)
         end,
         round((count(*) filter (where b.arrival_status in ('EARLY', 'ON_TIME'))::numeric / nullif(count(*) filter (where b.clock_in_time is not null), 0)) * 100, 2),
         count(*) filter (where b.arrival_status = 'LATE'),
         coalesce(avg(nullif(b.late_minutes, 0)), 0),
         count(*) filter (where b.status = 'ABSENT'),
         to_timestamp(avg(extract(epoch from timezone(v_org.timezone, b.clock_in_time))))::time,
         (p_to_date - p_from_date + 1)
  into v_attendance_rate, v_on_time_rate, v_late_arrivals, v_average_late, v_absences, v_average_arrival, v_total_days
  from base b
  cross join eligible_staff es;

  return jsonb_build_object(
    'attendance_rate', coalesce(v_attendance_rate, 0),
    'on_time_rate', coalesce(v_on_time_rate, 0),
    'late_arrivals', coalesce(v_late_arrivals, 0),
    'average_late_minutes', round(coalesce(v_average_late, 0), 0),
    'absences', coalesce(v_absences, 0),
    'average_arrival_time', v_average_arrival,
    'total_days', v_total_days
  );
end;
$$;

create or replace function public.get_staff_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.organization_members;
  v_org public.organizations;
  v_staff public.staff_profiles;
  v_record public.attendance_records;
  v_today date;
  v_status public.attendance_status;
  v_latest_notification public.notifications;
begin
  v_membership := public.current_membership();
  if v_membership.role <> 'STAFF' then
    raise exception 'Only staff members can view this dashboard.';
  end if;

  select * into v_org from public.organizations where id = v_membership.organization_id;
  perform public.sync_daily_absences(v_org.id);

  select * into v_staff
  from public.staff_profiles
  where organization_id = v_org.id and user_id = auth.uid();

  v_today := timezone(v_org.timezone, timezone('utc', now()))::date;

  select * into v_record
  from public.attendance_records
  where organization_id = v_org.id
    and staff_user_id = auth.uid()
    and attendance_date = v_today;

  if v_record.id is null then
    if (date_trunc('day', timezone(v_org.timezone, timezone('utc', now()))) + v_staff.scheduled_start_time + make_interval(mins => v_org.absence_grace_minutes)) <= timezone(v_org.timezone, timezone('utc', now())) then
      v_status := 'ABSENT';
    else
      v_status := 'NOT_YET_CLOCKED_IN';
    end if;
  else
    v_status := v_record.status;
  end if;

  select * into v_latest_notification
  from public.notifications n
  where n.recipient_user_id = auth.uid()
    and n.organization_id = v_org.id
  order by n.created_at desc
  limit 1;

  return jsonb_build_object(
    'profile_name', (select full_name from public.profiles where id = auth.uid()),
    'organization_name', v_org.name,
    'today_date', v_today,
    'timezone', v_org.timezone,
    'scheduled_start_time', v_staff.scheduled_start_time,
    'scheduled_end_time', v_staff.scheduled_end_time,
    'status', v_status,
    'clock_in_time', v_record.clock_in_time,
    'clock_out_time', v_record.clock_out_time,
    'late_minutes', coalesce(v_record.late_minutes, 0),
    'latest_notification', to_jsonb(v_latest_notification)
  );
end;
$$;

create or replace function public.get_staff_statistics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_attendance_rate numeric;
  v_on_time_rate numeric;
  v_late_arrivals integer;
  v_average_late numeric;
  v_absences integer;
begin
  v_org_id := public.current_organization_id();
  perform public.sync_daily_absences(v_org_id);

  with dates as (
    select count(*) as total
    from public.attendance_records ar
    where ar.organization_id = v_org_id
      and ar.staff_user_id = auth.uid()
  )
  select round((count(*) filter (where clock_in_time is not null)::numeric / nullif(count(*), 0)) * 100, 2),
         round((count(*) filter (where arrival_status in ('EARLY', 'ON_TIME'))::numeric / nullif(count(*) filter (where clock_in_time is not null), 0)) * 100, 2),
         count(*) filter (where arrival_status = 'LATE'),
         coalesce(avg(nullif(late_minutes, 0)), 0),
         count(*) filter (where status = 'ABSENT')
  into v_attendance_rate, v_on_time_rate, v_late_arrivals, v_average_late, v_absences
  from public.attendance_records ar
  where ar.organization_id = v_org_id
    and ar.staff_user_id = auth.uid();

  return jsonb_build_object(
    'attendance_rate', coalesce(v_attendance_rate, 0),
    'on_time_rate', coalesce(v_on_time_rate, 0),
    'late_arrivals', coalesce(v_late_arrivals, 0),
    'average_late_minutes', round(coalesce(v_average_late, 0), 0),
    'absences', coalesce(v_absences, 0),
    'average_arrival_time', null,
    'total_days', null
  );
end;
$$;

create or replace view public.staff_directory with (security_invoker = true) as
select sp.*, p.full_name, p.email
from public.staff_profiles sp
join public.profiles p on p.id = sp.user_id;

create or replace view public.attendance_history_view with (security_invoker = true) as
select ar.*, p.full_name, p.email
from public.attendance_records ar
join public.profiles p on p.id = ar.staff_user_id;

create or replace view public.staff_attendance_history_view with (security_invoker = true) as
select ar.*, p.full_name, p.email
from public.attendance_records ar
join public.profiles p on p.id = ar.staff_user_id;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.staff_invitations enable row level security;
alter table public.attendance_qr_tokens enable row level security;
alter table public.attendance_records enable row level security;
alter table public.qr_scan_events enable row level security;
alter table public.notifications enable row level security;
alter table public.attendance_audit_logs enable row level security;

create policy "profiles_self_or_owner_same_org_select"
on public.profiles for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.organization_members me
    join public.organization_members them on them.user_id = profiles.id and them.organization_id = me.organization_id
    where me.user_id = auth.uid()
      and me.status = 'ACTIVE'
      and me.role = 'OWNER'
  )
);

create policy "profiles_self_update"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "organizations_members_select"
on public.organizations for select
using (public.is_staff_of(id));

create policy "organizations_owners_update"
on public.organizations for update
using (public.is_owner_of(id))
with check (public.is_owner_of(id));

create policy "organization_members_owners_or_self_select"
on public.organization_members for select
using (
  user_id = auth.uid()
  or public.is_owner_of(organization_id)
);

create policy "staff_profiles_owner_or_self_select"
on public.staff_profiles for select
using (
  user_id = auth.uid()
  or public.is_owner_of(organization_id)
);

create policy "staff_profiles_owner_update"
on public.staff_profiles for update
using (public.is_owner_of(organization_id))
with check (public.is_owner_of(organization_id));

create policy "staff_invitations_owners_only"
on public.staff_invitations for select
using (public.is_owner_of(organization_id));

create policy "attendance_qr_tokens_owner_select"
on public.attendance_qr_tokens for select
using (public.is_owner_of(organization_id));

create policy "attendance_records_owner_or_self_select"
on public.attendance_records for select
using (
  staff_user_id = auth.uid()
  or public.is_owner_of(organization_id)
);

create policy "notifications_recipient_only"
on public.notifications for select
using (recipient_user_id = auth.uid());

create policy "notifications_recipient_update"
on public.notifications for update
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

create policy "qr_events_owner_or_self_select"
on public.qr_scan_events for select
using (user_id = auth.uid() or public.is_owner_of(organization_id));

create policy "audit_logs_owner_only"
on public.attendance_audit_logs for select
using (public.is_owner_of(organization_id));

grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, update on public.staff_profiles to authenticated;
grant select on public.staff_invitations to authenticated;
grant select on public.attendance_qr_tokens to authenticated;
grant select on public.attendance_records to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.qr_scan_events to authenticated;
grant select on public.attendance_audit_logs to authenticated;
grant select on public.staff_directory, public.attendance_history_view, public.staff_attendance_history_view to authenticated;
grant execute on function public.current_membership() to authenticated;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.is_owner_of(uuid) to authenticated;
grant execute on function public.is_staff_of(uuid) to authenticated;
grant execute on function public.create_organization(text, text, text, integer) to authenticated;
grant execute on function public.create_staff_invitation(text, text, time, time) to authenticated;
grant execute on function public.accept_staff_invitation(text) to authenticated;
grant execute on function public.owner_update_staff_profile(uuid, text, time, time, public.employment_status) to authenticated;
grant execute on function public.issue_attendance_qr() to authenticated;
grant execute on function public.preview_clock_in(text) to authenticated;
grant execute on function public.submit_clock_in(text, public.lateness_reason_code, text) to authenticated;
grant execute on function public.submit_clock_out(text) to authenticated;
grant execute on function public.get_owner_dashboard(date) to authenticated;
grant execute on function public.get_owner_statistics(date, date) to authenticated;
grant execute on function public.get_staff_dashboard() to authenticated;
grant execute on function public.get_staff_statistics() to authenticated;

commit;