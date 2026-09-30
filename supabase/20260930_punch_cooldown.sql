-- Prevent a second scan from immediately reversing a saved punch.
-- Apply after 20260929_ship_ready.sql. Existing punch history is unchanged.
begin;

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

commit;
