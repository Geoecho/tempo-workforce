-- Security hardening. Apply after 20261002_checkin_window.sql.
-- Behaviour for normal app use is unchanged: every limit below sits well above
-- what the Tempo client sends. The database is the enforcement point because the
-- Supabase URL and publishable key are public, so any caller can reach these RPCs
-- directly and bypass the client or the optional API gateway.
--
-- 1. Per-account rate limits on every mutating RPC (fixed window, HTTP 429).
-- 2. Payload size limits on workspace state.
-- 3. Messages: recipients restricted to what the app offers, body length capped,
--    and "mark read" limited to messages the caller can actually see.
-- 4. Invites: created_by must be the caller, worker must exist, email sanity check.
-- 5. MFA: once an account has a verified authenticator, every RPC requires a
--    session that completed the second factor (aal2). Accounts without MFA are
--    unaffected.
-- 6. Profile photos written by an admin must be inline JPEG/PNG/WebP images.
begin;

-- ---------------------------------------------------------------------------
-- Rate limiting
-- ---------------------------------------------------------------------------
create table if not exists public.tempo_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null,
  primary key (user_id, bucket)
);
alter table public.tempo_rate_limits enable row level security;
revoke all on public.tempo_rate_limits from public, anon, authenticated;

-- Raises SQLSTATE PT429, which PostgREST returns as HTTP 429. When the limit is
-- hit the exception rolls back the increment, so the counter stays at the limit
-- and further calls are refused until the window resets.
create or replace function public.tempo_check_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
  v_hits integer;
begin
  if v_uid is null then raise exception 'Sign in first'; end if;
  insert into public.tempo_rate_limits as r (user_id, bucket, window_start, hits)
    values (v_uid, p_bucket, v_now, 1)
  on conflict (user_id, bucket) do update set
    hits = case when r.window_start + pg_catalog.make_interval(secs => p_window_seconds) <= v_now then 1 else r.hits + 1 end,
    window_start = case when r.window_start + pg_catalog.make_interval(secs => p_window_seconds) <= v_now then v_now else r.window_start end
  returning hits into v_hits;
  if v_hits > p_max then
    raise exception 'Too many requests. Please wait a moment and try again.' using errcode = 'PT429';
  end if;
end;
$$;
-- Internal only: called from the security-definer RPCs below, never by clients.
revoke all on function public.tempo_check_rate_limit(text, integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Multi-factor authentication
-- ---------------------------------------------------------------------------
-- Without this, a stolen password would still open an account that enrolled MFA,
-- because the data API accepts any aal1 session token.
create or replace function public.tempo_mfa_satisfied()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors
      where user_id = (select auth.uid()) and status = 'verified'
    );
$$;
revoke all on function public.tempo_mfa_satisfied() from public, anon, authenticated;

create or replace function public.tempo_require_mfa()
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.tempo_mfa_satisfied() then
    raise exception 'Two-factor verification required. Sign in again.' using errcode = 'PT403';
  end if;
end;
$$;
revoke all on function public.tempo_require_mfa() from public, anon, authenticated;

-- Used by tempo_save_snapshot and the invites RLS policy.
create or replace function public.tempo_is_admin(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tempo_members
    where workspace_id = p_workspace_id and user_id = (select auth.uid()) and role = 'admin'
  ) and public.tempo_mfa_satisfied();
$$;
revoke all on function public.tempo_is_admin(uuid) from public, anon;
grant execute on function public.tempo_is_admin(uuid) to authenticated;

-- Read RPCs: same as 20260929_ship_ready.sql, 20260930_paid_breaks.sql and
-- 20261001_messages.sql plus the MFA requirement.
create or replace function public.tempo_snapshot()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_member public.tempo_members%rowtype;
  v_workspace public.tempo_workspaces%rowtype;
  v_state jsonb;
  v_notifications jsonb;
  v_approvals jsonb;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then return null; end if;
  perform public.tempo_require_mfa();
  select * into v_workspace from public.tempo_workspaces where id = v_member.workspace_id;
  v_state := v_workspace.state;
  if v_member.role = 'worker' then
    v_state := v_state || pg_catalog.jsonb_build_object(
      'role', 'worker', 'selectedWorkerId', v_member.worker_id,
      'workers', coalesce((select pg_catalog.jsonb_agg(w) from pg_catalog.jsonb_array_elements(v_state->'workers') w where w->>'id' = v_member.worker_id), '[]'::jsonb),
      'shifts', coalesce((select pg_catalog.jsonb_agg(s) from pg_catalog.jsonb_array_elements(v_state->'shifts') s where (s->'workerIds') ? v_member.worker_id), '[]'::jsonb),
      'punches', coalesce((select pg_catalog.jsonb_agg(p) from pg_catalog.jsonb_array_elements(v_state->'punches') p where p->>'workerId' = v_member.worker_id), '[]'::jsonb)
    );
  else
    v_state := v_state || '{"role":"admin"}'::jsonb;
  end if;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id', n.id, 'workerId', n.worker_id, 'shiftId', n.shift_id,
    'kind', n.kind, 'title', n.title, 'body', n.body,
    'createdAt', n.created_at, 'readAt', n.read_at
  ) order by n.created_at desc), '[]'::jsonb) into v_notifications
  from public.tempo_notifications n
  where n.workspace_id = v_workspace.id and v_member.role = 'worker' and n.worker_id = v_member.worker_id;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'workerId', a.worker_id, 'date', a.work_date,
    'approvedBy', a.approved_by, 'approvedAt', a.approved_at
  )), '[]'::jsonb) into v_approvals
  from public.tempo_time_approvals a
  where a.workspace_id = v_workspace.id and (v_member.role = 'admin' or a.worker_id = v_member.worker_id);
  return pg_catalog.jsonb_build_object(
    'workspaceId', v_workspace.id, 'version', v_workspace.version,
    'state', v_state, 'notifications', v_notifications, 'approvals', v_approvals
  );
end;
$$;

create or replace function public.tempo_break_snapshot()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_member public.tempo_members%rowtype;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then return '[]'::jsonb; end if;
  perform public.tempo_require_mfa();
  return coalesce((
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id', b.id, 'shiftId', b.shift_id, 'workerId', b.worker_id,
      'type', b.kind, 'at', b.at, 'workDate', b.work_date
    ) order by b.at, b.id)
    from public.tempo_break_events b
    where b.workspace_id = v_member.workspace_id
      and (v_member.role = 'admin' or b.worker_id = v_member.worker_id)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.tempo_messages_snapshot()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_member public.tempo_members%rowtype;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then return '[]'::jsonb; end if;
  perform public.tempo_require_mfa();
  if v_member.role = 'admin' then
    return coalesce(
      (select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', m.id, 'from', m.from_role, 'to', m.to_target,
          'body', m.body, 'createdAt', m.created_at, 'readAt', m.read_at
        ) order by m.created_at
      ) from public.tempo_messages m where m.workspace_id = v_member.workspace_id),
      '[]'::jsonb
    );
  else
    return coalesce(
      (select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', m.id, 'from', m.from_role, 'to', m.to_target,
          'body', m.body, 'createdAt', m.created_at, 'readAt', m.read_at
        ) order by m.created_at
      ) from public.tempo_messages m
      where m.workspace_id = v_member.workspace_id
        and (m.to_target = 'all' or m.to_target = v_member.worker_id or m.from_role = v_member.worker_id)),
      '[]'::jsonb
    );
  end if;
end;
$$;
revoke all on function public.tempo_snapshot() from public, anon;
revoke all on function public.tempo_break_snapshot() from public, anon;
grant execute on function public.tempo_snapshot() to authenticated;
grant execute on function public.tempo_break_snapshot() to authenticated;

-- ---------------------------------------------------------------------------
-- Workspace lifecycle
-- ---------------------------------------------------------------------------
create or replace function public.tempo_accept_invite()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_email text;
  v_invite public.tempo_invites%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in first';
  end if;
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('accept_invite', 30, 60);
  if exists (select 1 from public.tempo_members where user_id = (select auth.uid())) then
    return true;
  end if;
  select lower(email) into v_email from auth.users
    where id = (select auth.uid()) and email_confirmed_at is not null;
  if v_email is null then return false; end if;
  select * into v_invite from public.tempo_invites
    where email = v_email order by created_at limit 1 for update;
  if not found then return false; end if;
  insert into public.tempo_members (workspace_id, user_id, role, worker_id)
    values (v_invite.workspace_id, (select auth.uid()), 'worker', v_invite.worker_id);
  delete from public.tempo_invites
    where workspace_id = v_invite.workspace_id and email = v_invite.email;
  return true;
end;
$$;

create or replace function public.tempo_create_workspace(p_state jsonb, p_time_zone text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Sign in first'; end if;
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('create_workspace', 5, 60);
  if exists (select 1 from public.tempo_members where user_id = (select auth.uid())) then
    raise exception 'Account already belongs to a workspace';
  end if;
  if exists (select 1 from public.tempo_invites i join auth.users u on lower(u.email) = i.email
             where u.id = (select auth.uid())) then
    raise exception 'Accept your worker invitation instead';
  end if;
  if jsonb_typeof(p_state) <> 'object'
    or jsonb_typeof(p_state->'workers') <> 'array'
    or jsonb_typeof(p_state->'shifts') <> 'array'
    or jsonb_typeof(p_state->'punches') <> 'array' then
    raise exception 'Invalid workspace state';
  end if;
  -- A new workspace is a few hundred bytes; 1 MB leaves ample headroom.
  if pg_catalog.pg_column_size(p_state) > 1048576 then
    raise exception 'Workspace state is too large';
  end if;
  if p_time_zone is null or length(p_time_zone) > 64
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    p_time_zone := 'UTC';
  end if;
  insert into public.tempo_workspaces (owner_id, time_zone, state)
    values ((select auth.uid()), p_time_zone, p_state) returning id into v_id;
  insert into public.tempo_members (workspace_id, user_id, role)
    values (v_id, (select auth.uid()), 'admin');
  return v_id;
end;
$$;

-- Same as 20260929_ship_ready.sql plus a rate limit and a state size cap.
-- 20 MB allows hundreds of workers with compressed profile photos (≤60 KB each).
create or replace function public.tempo_save_snapshot(p_workspace_id uuid, p_expected_version bigint, p_state jsonb)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare
  v_workspace public.tempo_workspaces%rowtype;
  v_version bigint;
  v_shift_id text;
  v_worker_id text;
  v_old jsonb;
  v_new jsonb;
  v_kind text;
  v_site text;
begin
  if not public.tempo_is_admin(p_workspace_id) then raise exception 'Admin access required'; end if;
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('save_snapshot', 120, 60);
  if pg_catalog.pg_column_size(p_state) > 20971520 then raise exception 'Workspace state is too large'; end if;
  select * into v_workspace from public.tempo_workspaces where id = p_workspace_id for update;
  if v_workspace.version <> p_expected_version then raise exception 'Workspace changed on another device. Reload and retry.'; end if;
  if jsonb_typeof(p_state) <> 'object' or jsonb_typeof(p_state->'workers') <> 'array'
    or jsonb_typeof(p_state->'shifts') <> 'array' or jsonb_typeof(p_state->'punches') <> 'array' then
    raise exception 'Invalid workspace state';
  end if;
  -- The app stores compressed inline photos. A new or changed photo must be one,
  -- so an admin cannot point workers' devices at an external tracking URL.
  -- Unchanged existing values are left alone.
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(p_state->'workers') w
    where jsonb_typeof(w->'photoUri') = 'string' and w->>'photoUri' <> ''
      and w->>'photoUri' !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'
      and not exists (
        select 1 from pg_catalog.jsonb_array_elements(v_workspace.state->'workers') o
        where o->>'id' = w->>'id' and o->'photoUri' = w->'photoUri'
      )
  ) then
    raise exception 'Profile photos must be added from the app';
  end if;
  if p_state->'punches' <> v_workspace.state->'punches' then
    raise exception 'Clock history can only be changed by the scan operation';
  end if;
  update public.tempo_workspaces
    set state = p_state || '{"role":"admin"}'::jsonb, version = version + 1
    where id = p_workspace_id returning version into v_version;
  for v_shift_id in
    select distinct id from (
      select s->>'id' as id from pg_catalog.jsonb_array_elements(v_workspace.state->'shifts') s
      union select s->>'id' as id from pg_catalog.jsonb_array_elements(p_state->'shifts') s
    ) all_ids where id is not null
  loop
    select s into v_old from pg_catalog.jsonb_array_elements(v_workspace.state->'shifts') s where s->>'id' = v_shift_id limit 1;
    select s into v_new from pg_catalog.jsonb_array_elements(p_state->'shifts') s where s->>'id' = v_shift_id limit 1;
    if pg_catalog.jsonb_build_array(v_old->>'title', v_old->>'site', v_old->>'location', v_old->>'date', v_old->>'start', v_old->>'end', v_old->'workerIds', v_old->>'archived')
       is not distinct from
       pg_catalog.jsonb_build_array(v_new->>'title', v_new->>'site', v_new->>'location', v_new->>'date', v_new->>'start', v_new->>'end', v_new->'workerIds', v_new->>'archived') then
      continue;
    end if;
    for v_worker_id in
      select distinct worker_id from (
        select pg_catalog.jsonb_array_elements_text(coalesce(v_old->'workerIds', '[]'::jsonb)) as worker_id
        union select pg_catalog.jsonb_array_elements_text(coalesce(v_new->'workerIds', '[]'::jsonb)) as worker_id
      ) assigned
    loop
      if v_new is null or coalesce((v_new->>'archived')::boolean, false) or not coalesce((v_new->'workerIds') ? v_worker_id, false) then
        v_kind := 'removed';
      elsif v_old is null or coalesce((v_old->>'archived')::boolean, false) or not coalesce((v_old->'workerIds') ? v_worker_id, false) then
        v_kind := 'assigned';
      else
        v_kind := 'changed';
      end if;
      v_site := coalesce(v_new->>'site', v_old->>'site', 'your site');
      insert into public.tempo_notifications(workspace_id, worker_id, shift_id, kind, title, body)
        values (p_workspace_id, v_worker_id, v_shift_id, v_kind,
          case v_kind when 'assigned' then 'New shift assigned' when 'removed' then 'Shift removed' else 'Shift updated' end,
          case v_kind when 'removed' then 'Your shift at ' || v_site || ' was removed.'
            else coalesce(v_new->>'title', 'Shift') || ' at ' || v_site || ' · ' || coalesce(v_new->>'date', '') || ' ' || coalesce(v_new->>'start', '') end);
    end loop;
  end loop;
  return v_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- Clock, QR, breaks and approvals
-- ---------------------------------------------------------------------------
-- A display refreshes once per 30 s; 60/min covers several site displays per admin.
create or replace function public.tempo_issue_qr(p_shift_id text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_workspace public.tempo_workspaces%rowtype; v_shift jsonb; v_token uuid;
begin
  select w.* into v_workspace from public.tempo_workspaces w
    join public.tempo_members m on m.workspace_id = w.id
    where m.user_id = (select auth.uid()) and m.role = 'admin';
  if not found then raise exception 'Admin access required'; end if;
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('issue_qr', 60, 60);
  select s into v_shift from pg_catalog.jsonb_array_elements(v_workspace.state->'shifts') s where s->>'id' = p_shift_id limit 1;
  if v_shift is null or coalesce((v_shift->>'archived')::boolean, false) then raise exception 'This shift is no longer available'; end if;
  if v_shift->>'date' <> (clock_timestamp() at time zone v_workspace.time_zone)::date::text then raise exception 'Site codes are available on the shift day'; end if;
  delete from public.tempo_qr_tokens where expires_at < clock_timestamp();
  insert into public.tempo_qr_tokens(workspace_id, shift_id, expires_at)
    values (v_workspace.id, p_shift_id, clock_timestamp() + interval '35 seconds') returning token into v_token;
  return 'tempo:v2:' || v_token::text;
end;
$$;

-- Same as 20260930_punch_cooldown.sql plus a rate limit and an input length cap.
create or replace function public.tempo_record_punch(p_payload text, p_source text default 'qr')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_member public.tempo_members%rowtype;
  v_workspace public.tempo_workspaces%rowtype;
  v_parts text[];
  v_shift_id text;
  v_shift jsonb;
  v_worker jsonb;
  v_last_type text;
  v_last_at timestamptz;
  v_type text;
  v_open_count integer;
  v_punch jsonb;
  v_end timestamptz;
  v_at timestamptz := clock_timestamp();
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid()) and role = 'worker';
  if not found then raise exception 'Worker access required'; end if;
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('record_punch', 20, 60);
  if p_source is distinct from 'qr' then raise exception 'Scan the site QR code to record time'; end if;
  if p_payload is null or length(p_payload) > 64 then raise exception 'This QR code is invalid or has expired'; end if;
  v_parts := pg_catalog.regexp_match(p_payload, '^tempo:v2:([0-9a-fA-F-]{36})$');
  if v_parts is null then raise exception 'This QR code is invalid or has expired'; end if;
  select shift_id into v_shift_id from public.tempo_qr_tokens
    where token = v_parts[1]::uuid and workspace_id = v_member.workspace_id and expires_at >= v_at;
  if v_shift_id is null then raise exception 'This QR code is invalid or has expired'; end if;
  select * into v_workspace from public.tempo_workspaces where id = v_member.workspace_id for update;
  select s into v_shift from pg_catalog.jsonb_array_elements(v_workspace.state->'shifts') s where s->>'id' = v_shift_id limit 1;
  if v_shift is null or coalesce((v_shift->>'archived')::boolean, false) then raise exception 'This shift is no longer available'; end if;
  if v_shift->>'date' <> (v_at at time zone v_workspace.time_zone)::date::text then raise exception 'This code is for a shift on another day'; end if;
  if not ((v_shift->'workerIds') ? v_member.worker_id) then raise exception 'You are not assigned to this shift'; end if;
  select w into v_worker from pg_catalog.jsonb_array_elements(v_workspace.state->'workers') w where w->>'id' = v_member.worker_id limit 1;
  if v_worker is null or coalesce((v_worker->>'archived')::boolean, false) then raise exception 'Worker profile not available'; end if;
  select max((p->>'at')::timestamptz) into v_last_at
    from pg_catalog.jsonb_array_elements(v_workspace.state->'punches') p
    where p->>'workerId' = v_member.worker_id;
  if v_last_at is not null and v_last_at + interval '45 seconds' > v_at then
    raise exception 'Please wait % seconds before scanning again. Your last clock action was saved',
      greatest(1, pg_catalog.ceil(extract(epoch from (v_last_at + interval '45 seconds' - v_at)))::integer);
  end if;
  select p->>'type' into v_last_type from pg_catalog.jsonb_array_elements(v_workspace.state->'punches') with ordinality as x(p, ord)
    where p->>'workerId' = v_member.worker_id and p->>'shiftId' = v_shift_id order by ord desc limit 1;
  v_type := case when v_last_type = 'in' then 'out' else 'in' end;
  if v_type = 'in' then
    v_end := ((v_shift->>'date') || ' ' || (v_shift->>'end'))::timestamp at time zone v_workspace.time_zone;
    if (v_shift->>'end') <= (v_shift->>'start') then v_end := v_end + interval '1 day'; end if;
    if v_at > v_end then raise exception 'This shift has ended, so check-in is closed. Ask a manager if you worked it'; end if;
    if coalesce((v_worker->>'hourlyRate')::numeric, 0) <= 0 then raise exception 'Ask an admin to set your hourly rate before check-in'; end if;
    select count(*) into v_open_count from (
      select distinct on (p->>'shiftId') p->>'type' as last_type
      from pg_catalog.jsonb_array_elements(v_workspace.state->'punches') with ordinality as x(p, ord)
      where p->>'workerId' = v_member.worker_id order by p->>'shiftId', ord desc
    ) latest where last_type = 'in';
    if v_open_count > 0 then raise exception 'Check out of your current shift before checking in elsewhere'; end if;
  end if;
  v_punch := pg_catalog.jsonb_build_object(
    'id', gen_random_uuid()::text, 'shiftId', v_shift_id, 'workerId', v_member.worker_id,
    'type', v_type, 'at', v_at, 'source', p_source, 'workDate', v_shift->>'date'
  );
  if v_type = 'in' then v_punch := v_punch || pg_catalog.jsonb_build_object('rateAtCheckIn', (v_worker->>'hourlyRate')::numeric); end if;
  update public.tempo_workspaces set state = pg_catalog.jsonb_set(state, '{punches}', (state->'punches') || pg_catalog.jsonb_build_array(v_punch)), version = version + 1 where id = v_workspace.id;
  delete from public.tempo_time_approvals where workspace_id = v_workspace.id and worker_id = v_member.worker_id and work_date = (v_shift->>'date')::date;
  return pg_catalog.jsonb_build_object('ok', true, 'type', v_type,
    'message', case when v_type = 'in' then 'Checked in to ' else 'Checked out of ' end || (v_shift->>'site'));
end;
$$;

-- Same as 20260930_paid_breaks.sql plus a rate limit.
create or replace function public.tempo_record_break(p_shift_id text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_member public.tempo_members%rowtype;
  v_workspace public.tempo_workspaces%rowtype;
  v_shift jsonb;
  v_punch_type text;
  v_punch_at timestamptz;
  v_break_type text;
  v_break_at timestamptz;
  v_type text;
  v_at timestamptz := clock_timestamp();
begin
  select * into v_member from public.tempo_members
    where user_id = (select auth.uid()) and role = 'worker';
  if not found then raise exception 'Worker access required'; end if;
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('record_break', 20, 60);
  select * into v_workspace from public.tempo_workspaces
    where id = v_member.workspace_id for update;
  select s into v_shift from pg_catalog.jsonb_array_elements(v_workspace.state->'shifts') s
    where s->>'id' = p_shift_id limit 1;
  if v_shift is null or coalesce((v_shift->>'archived')::boolean, false)
    or not ((v_shift->'workerIds') ? v_member.worker_id) then
    raise exception 'This shift is not available to you';
  end if;
  if v_shift->>'date' <> (v_at at time zone v_workspace.time_zone)::date::text then
    raise exception 'Breaks can only be recorded on the shift day';
  end if;
  select p->>'type', (p->>'at')::timestamptz into v_punch_type, v_punch_at
    from pg_catalog.jsonb_array_elements(v_workspace.state->'punches') with ordinality as x(p, ord)
    where p->>'workerId' = v_member.worker_id and p->>'shiftId' = p_shift_id
    order by ord desc limit 1;
  if v_punch_type is distinct from 'in' then raise exception 'Check in before starting a break'; end if;
  select b.kind, b.at into v_break_type, v_break_at
    from public.tempo_break_events b
    where b.workspace_id = v_workspace.id and b.worker_id = v_member.worker_id
      and b.shift_id = p_shift_id and b.at > v_punch_at
    order by b.at desc, b.id desc limit 1;
  if v_break_at is not null and v_break_at + interval '15 seconds' > v_at then
    raise exception 'Please wait a moment before changing your break status';
  end if;
  v_type := case when v_break_type = 'start' then 'end' else 'start' end;
  insert into public.tempo_break_events(workspace_id, shift_id, worker_id, kind, at, work_date)
    values (v_workspace.id, p_shift_id, v_member.worker_id, v_type, v_at, (v_shift->>'date')::date);
  return pg_catalog.jsonb_build_object('ok', true, 'message',
    case when v_type = 'start' then 'Paid break started.' else 'Paid break ended.' end);
end;
$$;

-- Same as 20260929_ship_ready.sql plus a rate limit.
create or replace function public.tempo_review_time(p_worker_id text, p_date date, p_approve boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_workspace public.tempo_workspaces%rowtype; v_events jsonb; v_open_count integer;
begin
  select w.* into v_workspace from public.tempo_workspaces w
    join public.tempo_members m on m.workspace_id = w.id
    where m.user_id = (select auth.uid()) and m.role = 'admin' for update of w;
  if not found then raise exception 'Admin access required'; end if;
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('review_time', 240, 60);
  if not p_approve then
    delete from public.tempo_time_approvals where workspace_id = v_workspace.id and worker_id = p_worker_id and work_date = p_date;
    return true;
  end if;
  select coalesce(pg_catalog.jsonb_agg(p), '[]'::jsonb) into v_events
    from pg_catalog.jsonb_array_elements(v_workspace.state->'punches') p
    where p->>'workerId' = p_worker_id
      and coalesce(p->>'workDate', ((p->>'at')::timestamptz at time zone v_workspace.time_zone)::date::text) = p_date::text;
  if pg_catalog.jsonb_array_length(v_events) = 0 then raise exception 'No recorded time for this day'; end if;
  select count(*) into v_open_count from (
    select distinct on (p->>'shiftId') p->>'type' as last_type
    from pg_catalog.jsonb_array_elements(v_events) with ordinality as x(p, ord)
    order by p->>'shiftId', ord desc
  ) latest where last_type = 'in';
  if v_open_count > 0 then raise exception 'Worker must check out before approval'; end if;
  insert into public.tempo_time_approvals(workspace_id, worker_id, work_date, approved_by)
    values (v_workspace.id, p_worker_id, p_date, (select auth.uid()))
    on conflict (workspace_id, worker_id, work_date) do update
      set approved_by = excluded.approved_by, approved_at = now();
  return true;
end;
$$;

-- The inbox may mark many notifications at once, so this limit is generous.
create or replace function public.tempo_mark_notification_read(p_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_member public.tempo_members%rowtype;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid()) and role = 'worker';
  if not found then raise exception 'Worker access required'; end if;
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('mark_notification_read', 600, 60);
  update public.tempo_notifications set read_at = coalesce(read_at, clock_timestamp())
    where id = p_id and workspace_id = v_member.workspace_id and worker_id = v_member.worker_id;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------
-- Recipients match the conversations the app offers: an admin writes to the
-- whole team or to a worker in the workspace; a worker writes to the whole team
-- or to the admin. Previously any string was accepted, so a worker could message
-- another worker directly or flood the table with unbounded bodies.
create or replace function public.tempo_send_message(p_to text, p_body text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_member public.tempo_members%rowtype;
  v_from text;
  v_id uuid;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then raise exception 'Not a member'; end if;
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('send_message', 30, 60);
  if p_body is null or length(pg_catalog.btrim(p_body)) = 0 then raise exception 'Message cannot be empty'; end if;
  if length(p_body) > 4000 then raise exception 'Message is too long (4000 characters maximum)'; end if;
  if v_member.role = 'admin' then
    if p_to is null or (p_to <> 'all' and not exists (
      select 1 from public.tempo_workspaces w, pg_catalog.jsonb_array_elements(w.state->'workers') wk
      where w.id = v_member.workspace_id and wk->>'id' = p_to)) then
      raise exception 'Choose a valid recipient';
    end if;
  elsif p_to is null or p_to not in ('all', 'admin') then
    raise exception 'Choose a valid recipient';
  end if;
  v_from := case when v_member.role = 'admin' then 'admin' else v_member.worker_id end;
  insert into public.tempo_messages (workspace_id, from_role, to_target, body)
  values (v_member.workspace_id, v_from, p_to, p_body)
  returning id into v_id;
  return pg_catalog.jsonb_build_object('id', v_id, 'ok', true);
end;
$$;

-- Previously any member could mark any message in the workspace as read,
-- including private admin↔worker messages addressed to someone else.
create or replace function public.tempo_mark_message_read(p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_member public.tempo_members%rowtype;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then return; end if;
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('mark_message_read', 1000, 60);
  if v_member.role = 'admin' then
    update public.tempo_messages
    set read_at = now()
    where id = p_id and workspace_id = v_member.workspace_id and read_at is null
      and from_role <> 'admin';
  else
    update public.tempo_messages
    set read_at = now()
    where id = p_id and workspace_id = v_member.workspace_id and read_at is null
      and from_role <> v_member.worker_id
      and (to_target = 'all' or to_target = v_member.worker_id);
  end if;
end;
$$;

revoke all on function public.tempo_send_message(text, text) from public, anon;
revoke all on function public.tempo_messages_snapshot() from public, anon;
revoke all on function public.tempo_mark_message_read(uuid) from public, anon;
grant execute on function public.tempo_send_message(text, text) to authenticated;
grant execute on function public.tempo_messages_snapshot() to authenticated;
grant execute on function public.tempo_mark_message_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Invites (written directly through PostgREST under RLS)
-- ---------------------------------------------------------------------------
-- Admins could previously record another user's id as created_by.
drop policy if exists tempo_admin_invites on public.tempo_invites;
create policy tempo_admin_invites on public.tempo_invites
  for all to authenticated
  using (public.tempo_is_admin(workspace_id))
  with check (public.tempo_is_admin(workspace_id) and created_by = (select auth.uid()));

-- NOT VALID: existing rows are left untouched; new and updated rows are checked.
alter table public.tempo_invites drop constraint if exists tempo_invites_email_format;
alter table public.tempo_invites add constraint tempo_invites_email_format
  check (length(email) <= 320 and email ~ '^\S+@\S+\.\S+$') not valid;

create or replace function public.tempo_guard_invite()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('invite', 30, 60);
  if not exists (
    select 1 from public.tempo_workspaces w, pg_catalog.jsonb_array_elements(w.state->'workers') wk
    where w.id = new.workspace_id and wk->>'id' = new.worker_id
      and not coalesce((wk->>'archived')::boolean, false)
  ) then
    raise exception 'Choose an active worker';
  end if;
  return new;
end;
$$;
revoke all on function public.tempo_guard_invite() from public, anon, authenticated;

drop trigger if exists tempo_guard_invite on public.tempo_invites;
create trigger tempo_guard_invite before insert or update on public.tempo_invites
  for each row execute function public.tempo_guard_invite();

-- Re-assert function privileges (create or replace keeps them, this is a safety net).
revoke all on function public.tempo_accept_invite() from public, anon;
revoke all on function public.tempo_create_workspace(jsonb, text) from public, anon;
revoke all on function public.tempo_save_snapshot(uuid, bigint, jsonb) from public, anon;
revoke all on function public.tempo_issue_qr(text) from public, anon;
revoke all on function public.tempo_record_punch(text, text) from public, anon;
revoke all on function public.tempo_record_break(text) from public, anon;
revoke all on function public.tempo_review_time(text, date, boolean) from public, anon;
revoke all on function public.tempo_mark_notification_read(uuid) from public, anon;
grant execute on function public.tempo_accept_invite() to authenticated;
grant execute on function public.tempo_create_workspace(jsonb, text) to authenticated;
grant execute on function public.tempo_save_snapshot(uuid, bigint, jsonb) to authenticated;
grant execute on function public.tempo_issue_qr(text) to authenticated;
grant execute on function public.tempo_record_punch(text, text) to authenticated;
grant execute on function public.tempo_record_break(text) to authenticated;
grant execute on function public.tempo_review_time(text, date, boolean) to authenticated;
grant execute on function public.tempo_mark_notification_read(uuid) to authenticated;

commit;
