-- RLS smoke checks for AttendSure
-- Run these after creating at least:
--   1) Owner A in Organization A
--   2) Staff A in Organization A
--   3) Owner B in Organization B
--   4) Staff B in Organization B
-- Execute through SQL editor using JWT impersonation or through separate signed-in sessions.

-- EXPECTED: Staff A can see only their own attendance.
select * from public.staff_attendance_history_view;

-- EXPECTED: Staff A cannot view Organization B attendance rows.
select *
from public.attendance_history_view
where organization_id = 'REPLACE_WITH_ORG_B_UUID';

-- EXPECTED: Staff A cannot update another staff profile.
update public.staff_profiles
set job_title = 'Attempted privilege escalation'
where user_id = 'REPLACE_WITH_STAFF_B_USER_ID';

-- EXPECTED: Staff A cannot update their organization membership role.
update public.organization_members
set role = 'OWNER'
where user_id = auth.uid();

-- EXPECTED: Owner A can read Organization A staff directory.
select * from public.staff_directory;

-- EXPECTED: Owner A cannot read Organization B rows.
select *
from public.staff_directory
where organization_id = 'REPLACE_WITH_ORG_B_UUID';

-- EXPECTED: Expired QR rejected.
select public.submit_clock_in('expired_or_invalid_token', null, null);

-- EXPECTED: Duplicate clock-in rejected on second call.
-- Replace token below with a valid active token from Organization A.
select public.submit_clock_in('REPLACE_WITH_VALID_TOKEN', null, null);
select public.submit_clock_in('REPLACE_WITH_VALID_TOKEN', null, null);
