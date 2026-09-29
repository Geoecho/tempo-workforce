-- Add server-issued site codes, shift alerts and manager time approval.
-- Safe for existing workspaces: all existing shifts and punches remain intact.
begin;

create table if not exists public.tempo_qr_tokens (
  token uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.tempo_workspaces(id) on delete cascade,
  shift_id text not null,
  expires_at timestamptz not null
);
create index if not exists tempo_qr_expiry_idx on public.tempo_qr_tokens(expires_at);
create table if not exists public.tempo_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.tempo_workspaces(id) on delete cascade,
  worker_id text not null,
  shift_id text not null,
  kind text not null check (kind in ('assigned', 'changed', 'removed')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists tempo_notifications_worker_idx on public.tempo_notifications(workspace_id, worker_id, created_at desc);
create table if not exists public.tempo_time_approvals (
  workspace_id uuid not null references public.tempo_workspaces(id) on delete cascade,
  worker_id text not null,
  work_date date not null,
  approved_by uuid not null references auth.users(id),
  approved_at timestamptz not null default now(),
  primary key (workspace_id, worker_id, work_date)
);
alter table public.tempo_qr_tokens enable row level security;
alter table public.tempo_notifications enable row level security;
alter table public.tempo_time_approvals enable row level security;
revoke all on public.tempo_qr_tokens, public.tempo_notifications, public.tempo_time_approvals from anon, authenticated;

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
  select * into v_workspace from public.tempo_workspaces where id = p_workspace_id for update;
  if v_workspace.version <> p_expected_version then raise exception 'Workspace changed on another device. Reload and retry.'; end if;
  if jsonb_typeof(p_state) <> 'object' or jsonb_typeof(p_state->'workers') <> 'array'
    or jsonb_typeof(p_state->'shifts') <> 'array' or jsonb_typeof(p_state->'punches') <> 'array' then
    raise exception 'Invalid workspace state';
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

create or replace function public.tempo_issue_qr(p_shift_id text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_workspace public.tempo_workspaces%rowtype; v_shift jsonb; v_token uuid;
begin
  select w.* into v_workspace from public.tempo_workspaces w
    join public.tempo_members m on m.workspace_id = w.id
    where m.user_id = (select auth.uid()) and m.role = 'admin';
  if not found then raise exception 'Admin access required'; end if;
  select s into v_shift from pg_catalog.jsonb_array_elements(v_workspace.state->'shifts') s where s->>'id' = p_shift_id limit 1;
  if v_shift is null or coalesce((v_shift->>'archived')::boolean, false) then raise exception 'This shift is no longer available'; end if;
  if v_shift->>'date' <> (clock_timestamp() at time zone v_workspace.time_zone)::date::text then raise exception 'Site codes are available on the shift day'; end if;
  delete from public.tempo_qr_tokens where expires_at < clock_timestamp();
  insert into public.tempo_qr_tokens(workspace_id, shift_id, expires_at)
    values (v_workspace.id, p_shift_id, clock_timestamp() + interval '35 seconds') returning token into v_token;
  return 'tempo:v2:' || v_token::text;
end;
$$;

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
  v_type text;
  v_open_count integer;
  v_punch jsonb;
  v_at timestamptz := clock_timestamp();
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid()) and role = 'worker';
  if not found then raise exception 'Worker access required'; end if;
  if p_source <> 'qr' then raise exception 'Scan the site QR code to record time'; end if;
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
  select p->>'type' into v_last_type from pg_catalog.jsonb_array_elements(v_workspace.state->'punches') with ordinality as x(p, ord)
    where p->>'workerId' = v_member.worker_id and p->>'shiftId' = v_shift_id order by ord desc limit 1;
  v_type := case when v_last_type = 'in' then 'out' else 'in' end;
  if v_type = 'in' then
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

create or replace function public.tempo_review_time(p_worker_id text, p_date date, p_approve boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_workspace public.tempo_workspaces%rowtype; v_events jsonb; v_open_count integer;
begin
  select w.* into v_workspace from public.tempo_workspaces w
    join public.tempo_members m on m.workspace_id = w.id
    where m.user_id = (select auth.uid()) and m.role = 'admin' for update of w;
  if not found then raise exception 'Admin access required'; end if;
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

create or replace function public.tempo_mark_notification_read(p_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_member public.tempo_members%rowtype;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid()) and role = 'worker';
  if not found then raise exception 'Worker access required'; end if;
  update public.tempo_notifications set read_at = coalesce(read_at, clock_timestamp())
    where id = p_id and workspace_id = v_member.workspace_id and worker_id = v_member.worker_id;
  return found;
end;
$$;

revoke all on function public.tempo_issue_qr(text) from public, anon;
revoke all on function public.tempo_review_time(text, date, boolean) from public, anon;
revoke all on function public.tempo_mark_notification_read(uuid) from public, anon;
grant execute on function public.tempo_issue_qr(text) to authenticated;
grant execute on function public.tempo_review_time(text, date, boolean) to authenticated;
grant execute on function public.tempo_mark_notification_read(uuid) to authenticated;
commit;
