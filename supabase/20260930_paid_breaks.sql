-- Paid breaks are recorded separately from clock punches. They never reduce payable time.
begin;

create table if not exists public.tempo_break_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.tempo_workspaces(id) on delete cascade,
  shift_id text not null,
  worker_id text not null,
  kind text not null check (kind in ('start', 'end')),
  at timestamptz not null default now(),
  work_date date not null
);
create index if not exists tempo_break_events_lookup on public.tempo_break_events(workspace_id, worker_id, shift_id, at desc);
alter table public.tempo_break_events enable row level security;
revoke all on public.tempo_break_events from public, anon, authenticated;

create or replace function public.tempo_break_snapshot()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_member public.tempo_members%rowtype;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then return '[]'::jsonb; end if;
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

revoke all on function public.tempo_break_snapshot() from public, anon;
revoke all on function public.tempo_record_break(text) from public, anon;
grant execute on function public.tempo_break_snapshot() to authenticated;
grant execute on function public.tempo_record_break(text) to authenticated;

commit;
