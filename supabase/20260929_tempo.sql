-- Tempo's shared prototype store. Apply once in the Supabase SQL Editor.
-- Each signed-in account belongs to one workspace. Only admins can replace
-- workspace data; workers receive a filtered snapshot and write punches via RPC.

begin;

create table if not exists public.tempo_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  time_zone text not null default 'UTC',
  state jsonb not null,
  version bigint not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.tempo_members (
  workspace_id uuid not null references public.tempo_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'worker')),
  worker_id text,
  primary key (workspace_id, user_id),
  unique (user_id),
  check ((role = 'admin' and worker_id is null) or (role = 'worker' and worker_id is not null))
);

create table if not exists public.tempo_invites (
  workspace_id uuid not null references public.tempo_workspaces(id) on delete cascade,
  email text not null,
  worker_id text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (workspace_id, email),
  check (email = lower(trim(email)))
);

create index if not exists tempo_invites_email_idx on public.tempo_invites (email);

alter table public.tempo_workspaces enable row level security;
alter table public.tempo_members enable row level security;
alter table public.tempo_invites enable row level security;

create or replace function public.tempo_is_admin(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tempo_members
    where workspace_id = p_workspace_id and user_id = (select auth.uid()) and role = 'admin'
  );
$$;

drop policy if exists tempo_admin_invites on public.tempo_invites;
create policy tempo_admin_invites on public.tempo_invites
  for all to authenticated
  using (public.tempo_is_admin(workspace_id))
  with check (public.tempo_is_admin(workspace_id));

grant select, insert, update, delete on public.tempo_invites to authenticated;
revoke all on public.tempo_workspaces from anon, authenticated;
revoke all on public.tempo_members from anon, authenticated;

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
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    p_time_zone := 'UTC';
  end if;
  insert into public.tempo_workspaces (owner_id, time_zone, state)
    values ((select auth.uid()), p_time_zone, p_state) returning id into v_id;
  insert into public.tempo_members (workspace_id, user_id, role)
    values (v_id, (select auth.uid()), 'admin');
  return v_id;
end;
$$;

create or replace function public.tempo_snapshot()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_member public.tempo_members%rowtype;
  v_workspace public.tempo_workspaces%rowtype;
  v_state jsonb;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then return null; end if;
  select * into v_workspace from public.tempo_workspaces where id = v_member.workspace_id;
  v_state := v_workspace.state;
  if v_member.role = 'worker' then
    v_state := v_state || pg_catalog.jsonb_build_object(
      'role', 'worker', 'selectedWorkerId', v_member.worker_id,
      'workers', coalesce((select pg_catalog.jsonb_agg(w)
        from pg_catalog.jsonb_array_elements(v_state->'workers') w
        where w->>'id' = v_member.worker_id), '[]'::jsonb),
      'shifts', coalesce((select pg_catalog.jsonb_agg(s)
        from pg_catalog.jsonb_array_elements(v_state->'shifts') s
        where (s->'workerIds') ? v_member.worker_id), '[]'::jsonb),
      'punches', coalesce((select pg_catalog.jsonb_agg(p)
        from pg_catalog.jsonb_array_elements(v_state->'punches') p
        where p->>'workerId' = v_member.worker_id), '[]'::jsonb)
    );
  else
    v_state := v_state || '{"role":"admin"}'::jsonb;
  end if;
  return pg_catalog.jsonb_build_object(
    'workspaceId', v_workspace.id, 'version', v_workspace.version, 'state', v_state
  );
end;
$$;

create or replace function public.tempo_save_snapshot(
  p_workspace_id uuid, p_expected_version bigint, p_state jsonb
)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare
  v_workspace public.tempo_workspaces%rowtype;
  v_version bigint;
begin
  if not public.tempo_is_admin(p_workspace_id) then raise exception 'Admin access required'; end if;
  select * into v_workspace from public.tempo_workspaces where id = p_workspace_id for update;
  if v_workspace.version <> p_expected_version then raise exception 'Workspace changed on another device. Reload and retry.'; end if;
  if jsonb_typeof(p_state) <> 'object'
    or jsonb_typeof(p_state->'workers') <> 'array'
    or jsonb_typeof(p_state->'shifts') <> 'array'
    or jsonb_typeof(p_state->'punches') <> 'array' then
    raise exception 'Invalid workspace state';
  end if;
  if p_state->'punches' <> v_workspace.state->'punches' then
    raise exception 'Clock history can only be changed by the scan operation';
  end if;
  update public.tempo_workspaces
    set state = p_state || '{"role":"admin"}'::jsonb, version = version + 1
    where id = p_workspace_id returning version into v_version;
  return v_version;
end;
$$;

create or replace function public.tempo_record_punch(p_payload text, p_source text default 'qr')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_member public.tempo_members%rowtype;
  v_workspace public.tempo_workspaces%rowtype;
  v_parts text[];
  v_shift jsonb;
  v_worker jsonb;
  v_last_type text;
  v_type text;
  v_open_count integer;
  v_punch jsonb;
  v_at timestamptz := clock_timestamp();
begin
  select * into v_member from public.tempo_members
    where user_id = (select auth.uid()) and role = 'worker';
  if not found then raise exception 'Worker access required'; end if;
  if p_source <> 'qr' then raise exception 'Scan the site QR code to record time'; end if;
  v_parts := pg_catalog.regexp_match(p_payload, '^tempo:v1:([^:]+):([0-9]+)$');
  if v_parts is null or length(v_parts[2]) > 15
    or abs(floor(extract(epoch from v_at) / 30)::bigint - v_parts[2]::bigint) > 1 then
    raise exception 'This QR code is invalid or has expired';
  end if;
  select * into v_workspace from public.tempo_workspaces
    where id = v_member.workspace_id for update;
  select s into v_shift from pg_catalog.jsonb_array_elements(v_workspace.state->'shifts') s
    where s->>'id' = v_parts[1] limit 1;
  if v_shift is null or coalesce((v_shift->>'archived')::boolean, false) then
    raise exception 'This shift is no longer available';
  end if;
  if v_shift->>'date' <> (v_at at time zone v_workspace.time_zone)::date::text then
    raise exception 'This code is for a shift on another day';
  end if;
  if not ((v_shift->'workerIds') ? v_member.worker_id) then
    raise exception 'You are not assigned to this shift';
  end if;
  select w into v_worker from pg_catalog.jsonb_array_elements(v_workspace.state->'workers') w
    where w->>'id' = v_member.worker_id limit 1;
  if v_worker is null or coalesce((v_worker->>'archived')::boolean, false) then
    raise exception 'Worker profile not available';
  end if;
  select p->>'type' into v_last_type
    from pg_catalog.jsonb_array_elements(v_workspace.state->'punches') with ordinality as x(p, ord)
    where p->>'workerId' = v_member.worker_id and p->>'shiftId' = v_parts[1]
    order by ord desc limit 1;
  v_type := case when v_last_type = 'in' then 'out' else 'in' end;
  if v_type = 'in' then
    if coalesce((v_worker->>'hourlyRate')::numeric, 0) <= 0 then
      raise exception 'Ask an admin to set your hourly rate before check-in';
    end if;
    select count(*) into v_open_count from (
      select distinct on (p->>'shiftId') p->>'type' as last_type
      from pg_catalog.jsonb_array_elements(v_workspace.state->'punches') with ordinality as x(p, ord)
      where p->>'workerId' = v_member.worker_id
      order by p->>'shiftId', ord desc
    ) latest where last_type = 'in';
    if v_open_count > 0 then
      raise exception 'Check out of your current shift before checking in elsewhere';
    end if;
  end if;
  v_punch := pg_catalog.jsonb_build_object(
    'id', gen_random_uuid()::text, 'shiftId', v_parts[1],
    'workerId', v_member.worker_id, 'type', v_type,
    'at', v_at, 'source', p_source
  );
  if v_type = 'in' then
    v_punch := v_punch || pg_catalog.jsonb_build_object(
      'rateAtCheckIn', (v_worker->>'hourlyRate')::numeric
    );
  end if;
  update public.tempo_workspaces
    set state = pg_catalog.jsonb_set(
      state, '{punches}', (state->'punches') || pg_catalog.jsonb_build_array(v_punch)
    ), version = version + 1
    where id = v_workspace.id;
  return pg_catalog.jsonb_build_object(
    'ok', true, 'type', v_type,
    'message', case when v_type = 'in' then 'Checked in to ' else 'Checked out of ' end || (v_shift->>'site')
  );
end;
$$;

revoke all on function public.tempo_is_admin(uuid) from public, anon;
revoke all on function public.tempo_accept_invite() from public, anon;
revoke all on function public.tempo_create_workspace(jsonb, text) from public, anon;
revoke all on function public.tempo_snapshot() from public, anon;
revoke all on function public.tempo_save_snapshot(uuid, bigint, jsonb) from public, anon;
revoke all on function public.tempo_record_punch(text, text) from public, anon;
grant execute on function public.tempo_is_admin(uuid) to authenticated;
grant execute on function public.tempo_accept_invite() to authenticated;
grant execute on function public.tempo_create_workspace(jsonb, text) to authenticated;
grant execute on function public.tempo_snapshot() to authenticated;
grant execute on function public.tempo_save_snapshot(uuid, bigint, jsonb) to authenticated;
grant execute on function public.tempo_record_punch(text, text) to authenticated;

commit;
