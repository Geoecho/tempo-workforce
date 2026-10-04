-- Scheduling guardrails, attendance/leave requests, push registration and an
-- auditable review path. Apply after 20261004_shared_tasks.sql.
begin;
create table public.tempo_requests (
  id text primary key check (length(id) between 1 and 100),
  workspace_id uuid not null references public.tempo_workspaces(id) on delete cascade,
  worker_id text not null,
  kind text not null check (kind in ('leave', 'correction')),
  from_date date not null,
  to_date date not null,
  shift_id text,
  in_time time,
  out_time time,
  reason text not null check (length(reason) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_note text,
  check (to_date >= from_date and to_date - from_date <= 90)
);
create unique index tempo_pending_request on public.tempo_requests(workspace_id,worker_id,kind,from_date,coalesce(shift_id,'')) where status='pending';
create index tempo_requests_scope on public.tempo_requests(workspace_id, worker_id, created_at desc);
alter table public.tempo_requests enable row level security;
create policy requests_read on public.tempo_requests for select to authenticated using (public.tempo_task_can_read(workspace_id, worker_id));
grant select on public.tempo_requests to authenticated;
revoke insert, update, delete on public.tempo_requests from authenticated, anon;
create table public.tempo_review_audit (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.tempo_workspaces(id) on delete cascade,
  request_id text not null references public.tempo_requests(id),
  actor uuid not null,
  created_at timestamptz not null default now(),
  original_punches jsonb not null,
  corrected_punches jsonb not null
);
alter table public.tempo_review_audit enable row level security;
create policy review_audit_admin on public.tempo_review_audit for select to authenticated using (
  public.tempo_mfa_satisfied() and exists(select 1 from public.tempo_members m where m.user_id = auth.uid() and m.workspace_id = tempo_review_audit.workspace_id and m.role = 'admin')
);
grant select on public.tempo_review_audit to authenticated;
revoke insert, update, delete on public.tempo_review_audit from authenticated, anon;

create function public.tempo_request_list() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m public.tempo_members%rowtype;
begin
  select * into m from public.tempo_members where user_id = auth.uid();
  if not found then raise exception 'Sign in to your workspace first'; end if;
  perform public.tempo_require_mfa();
  return (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'workerId',r.worker_id,'kind',r.kind,'fromDate',r.from_date,'toDate',r.to_date,'shiftId',r.shift_id,'inTime',to_char(r.in_time,'HH24:MI'),'outTime',to_char(r.out_time,'HH24:MI'),'reason',r.reason,'status',r.status,'createdAt',r.created_at,'reviewedAt',r.reviewed_at,'reviewNote',r.review_note) order by r.created_at desc),'[]'::jsonb)
    from public.tempo_requests r where r.workspace_id=m.workspace_id and (m.role='admin' or r.worker_id=m.worker_id));
end; $$;

create function public.tempo_request_submit(p_id text,p_kind text,p_from date,p_until date,p_reason text,p_shift_id text default null,p_in time default null,p_out time default null) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.tempo_members%rowtype; w public.tempo_workspaces%rowtype; s jsonb;
begin
  select * into m from public.tempo_members where user_id=auth.uid() and role='worker';
  if not found then raise exception 'Worker access required'; end if;
  perform public.tempo_require_mfa(); perform public.tempo_check_rate_limit('request_submit',20,60);
  if p_kind not in ('leave','correction') or p_kind is null or p_from is null or p_until is null or p_until<p_from or p_until-p_from>90 or p_reason is null or length(trim(p_reason)) not between 1 and 1000 then raise exception 'Enter valid dates and a reason'; end if;
  select * into w from public.tempo_workspaces where id=m.workspace_id;
  if p_kind='correction' then
    select value into s from jsonb_array_elements(w.state->'shifts') where value->>'id'=p_shift_id and (value->'workerIds') ? m.worker_id;
    if s is null or p_in is null or p_out is null or p_in=p_out or p_in>=time '24:00' or p_out>=time '24:00' then raise exception 'Choose your shift and different clock times'; end if;
    if p_from<>(s->>'date')::date or p_until<>p_from then raise exception 'Use the shift work date'; end if;
  elsif p_from < (now() at time zone w.time_zone)::date then raise exception 'Leave must start today or later'; end if;
  if exists(select 1 from public.tempo_requests r where r.workspace_id=m.workspace_id and r.worker_id=m.worker_id and r.kind=p_kind and r.status='pending' and r.from_date=p_from and coalesce(r.shift_id,'')=coalesce(p_shift_id,'')) then raise exception 'A request for this day is already awaiting review'; end if;
  insert into public.tempo_requests(id,workspace_id,worker_id,kind,from_date,to_date,reason,shift_id,in_time,out_time) values(p_id,m.workspace_id,m.worker_id,p_kind,p_from,p_until,trim(p_reason),p_shift_id,p_in,p_out);
end; $$;

create function public.tempo_request_review(p_id text,p_approve boolean,p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.tempo_members%rowtype; r public.tempo_requests%rowtype; w public.tempo_workspaces%rowtype; s jsonb; person jsonb; original jsonb; corrected jsonb; pin timestamptz; pout timestamptz; rate numeric;
begin
  select * into m from public.tempo_members where user_id=auth.uid() and role='admin';
  if not found then raise exception 'Admin access required'; end if;
  perform public.tempo_require_mfa(); perform public.tempo_check_rate_limit('request_review',60,60);
  if p_approve is null or p_note is null or length(trim(p_note)) not between 1 and 1000 then raise exception 'Add a review note'; end if;
  select * into r from public.tempo_requests where id=p_id and workspace_id=m.workspace_id for update;
  if not found or r.status<>'pending' then raise exception 'This request is no longer awaiting review'; end if;
  select * into w from public.tempo_workspaces where id=m.workspace_id for update;
  if p_approve and r.kind='leave' then
    update public.tempo_workspaces set state=jsonb_set(w.state,'{workers}',(select jsonb_agg(case when worker->>'id'=r.worker_id then worker || jsonb_build_object('unavailableDates',(select jsonb_agg(day order by day) from (select distinct value as day from jsonb_array_elements_text(coalesce(worker->'unavailableDates','[]'::jsonb)) union select to_char(d,'YYYY-MM-DD') from generate_series(r.from_date::timestamp,r.to_date::timestamp,interval '1 day') d) days)) else worker end) from jsonb_array_elements(w.state->'workers') worker)),version=version+1 where id=w.id;
  elsif p_approve and r.kind='correction' then
    select value into s from jsonb_array_elements(w.state->'shifts') where value->>'id'=r.shift_id;
    select value into person from jsonb_array_elements(w.state->'workers') where value->>'id'=r.worker_id;
    if s is null or person is null then raise exception 'This worker or shift is no longer available'; end if;
    original := (select coalesce(jsonb_agg(p),'[]'::jsonb) from jsonb_array_elements(w.state->'punches') p where p->>'workerId'=r.worker_id and p->>'shiftId'=r.shift_id);
    pin := (r.from_date+r.in_time) at time zone w.time_zone;
    pout := (r.from_date+r.out_time+case when r.out_time<r.in_time then interval '1 day' else interval '0 day' end) at time zone w.time_zone;
    if pout>now() or pin>now() then raise exception 'Corrected attendance cannot be in the future'; end if;
    if exists(select 1 from jsonb_array_elements(w.state->'punches') as x(p) where p->>'workerId'=r.worker_id and p->>'shiftId'<>r.shift_id and p->>'type'='in'
      and (p->>'at')::timestamptz<pout and pin<coalesce((select min((q->>'at')::timestamptz) from jsonb_array_elements(w.state->'punches') q where q->>'workerId'=r.worker_id and q->>'shiftId'=p->>'shiftId' and q->>'type'='out' and (q->>'at')::timestamptz>(p->>'at')::timestamptz),now())) then raise exception 'Corrected time overlaps another attendance record'; end if;
    rate := coalesce((select (p->>'rateAtCheckIn')::numeric from jsonb_array_elements(original) p where p->>'type'='in' order by p->>'at' limit 1),(person->>'hourlyRate')::numeric);
    corrected := jsonb_build_array(jsonb_build_object('id',r.id||'-in','shiftId',r.shift_id,'workerId',r.worker_id,'type','in','at',pin,'workDate',r.from_date,'source','correction','rateAtCheckIn',rate),jsonb_build_object('id',r.id||'-out','shiftId',r.shift_id,'workerId',r.worker_id,'type','out','at',pout,'workDate',r.from_date,'source','correction'));
    insert into public.tempo_review_audit(workspace_id,request_id,actor,original_punches,corrected_punches) values(w.id,r.id,auth.uid(),original,corrected);
    update public.tempo_workspaces set state=jsonb_set(w.state,'{punches}',(select coalesce(jsonb_agg(p),'[]'::jsonb) from jsonb_array_elements(w.state->'punches') p where not(p->>'workerId'=r.worker_id and p->>'shiftId'=r.shift_id)) || corrected),version=version+1 where id=w.id;
    delete from public.tempo_time_approvals where workspace_id=w.id and worker_id=r.worker_id and work_date=r.from_date;
  end if;
  update public.tempo_requests set status=case when p_approve then 'approved' else 'rejected' end,review_note=trim(p_note),reviewed_at=now(),reviewed_by=auth.uid() where id=r.id;
end; $$;
revoke all on function public.tempo_request_list() from public,anon;
revoke all on function public.tempo_request_submit(text,text,date,date,text,text,time,time) from public,anon;
revoke all on function public.tempo_request_review(text,boolean,text) from public,anon;
grant execute on function public.tempo_request_list(),public.tempo_request_submit(text,text,date,date,text,text,time,time),public.tempo_request_review(text,boolean,text) to authenticated;

-- Serialized workspace writes keep conflict checks atomic across admins.
alter function public.tempo_save_snapshot(uuid,bigint,jsonb) rename to tempo_save_snapshot_base;
revoke all on function public.tempo_save_snapshot_base(uuid,bigint,jsonb) from public,anon,authenticated;
create function public.tempo_save_snapshot(p_workspace_id uuid,p_expected_version bigint,p_state jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare previous jsonb; s jsonb; other jsonb; person jsonb; worker text; a timestamp; b timestamp; c timestamp; d timestamp;
begin
  perform public.tempo_require_mfa();
  if not exists(select 1 from public.tempo_members m where m.user_id=auth.uid() and m.workspace_id=p_workspace_id and m.role='admin') then raise exception 'Admin access required'; end if;
  select state into previous from public.tempo_workspaces where id=p_workspace_id for update;
  for s in select value from jsonb_array_elements(p_state->'shifts') loop
    if coalesce((s->>'archived')::boolean,false) then continue; end if;
    if exists(select 1 from jsonb_array_elements(previous->'shifts') old where old->>'id'=s->>'id' and not coalesce((old->>'archived')::boolean,false) and old->'date'=s->'date' and old->'start'=s->'start' and old->'end'=s->'end' and old->'workerIds'=s->'workerIds') then continue; end if;
    if s->>'start' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or s->>'end' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or s->>'start'=s->>'end' then raise exception 'Choose different valid start and end times'; end if;
    if s ? 'requiredWorkers' and (jsonb_typeof(s->'requiredWorkers')<>'number' or (s->>'requiredWorkers')::numeric not between 1 and 100 or (s->>'requiredWorkers')::numeric<>trunc((s->>'requiredWorkers')::numeric)) then raise exception 'Choose a staffing requirement from 1 to 100'; end if;
    if jsonb_array_length(s->'workerIds')=0 then raise exception 'Assign at least one active worker to every time slot'; end if;
    a := ((s->>'date')||' '||(s->>'start'))::timestamp; b := ((s->>'date')||' '||(s->>'end'))::timestamp;
    if b<a then b:=b+interval '1 day'; end if;
    for worker in select jsonb_array_elements_text(s->'workerIds') loop
      select value into person from jsonb_array_elements(p_state->'workers') where value->>'id'=worker and not coalesce((value->>'archived')::boolean,false);
      if person is null then raise exception 'Assign active workers only'; end if;
      if exists(select 1 from generate_series(a::date::timestamp,(b-interval '1 microsecond')::date::timestamp,interval '1 day') day where (person ? 'availableDays' and not (person->'availableDays') @> jsonb_build_array(extract(dow from day)::integer)) or (coalesce(person->'unavailableDates','[]'::jsonb)) ? to_char(day,'YYYY-MM-DD')) or exists(select 1 from public.tempo_requests r where r.workspace_id=p_workspace_id and r.worker_id=worker and r.kind='leave' and r.status='approved' and a::date<=r.to_date and (b-interval '1 microsecond')::date>=r.from_date) then raise exception 'A selected worker is unavailable on this date'; end if;
      for other in select value from jsonb_array_elements(p_state->'shifts') where value->>'id'<>s->>'id' and not coalesce((value->>'archived')::boolean,false) and (value->'workerIds') ? worker loop
        c:=((other->>'date')||' '||(other->>'start'))::timestamp; d:=((other->>'date')||' '||(other->>'end'))::timestamp; if d<c then d:=d+interval '1 day'; end if;
        if a<d and c<b then raise exception 'A worker already has a shift during these hours'; end if;
      end loop;
    end loop;
  end loop;
  return public.tempo_save_snapshot_base(p_workspace_id,p_expected_version,p_state);
end; $$;
revoke all on function public.tempo_save_snapshot(uuid,bigint,jsonb) from public,anon;
grant execute on function public.tempo_save_snapshot(uuid,bigint,jsonb) to authenticated;

create table public.tempo_push_devices (
  token text primary key check(length(token)<250 and token ~ '^(ExponentPushToken|ExpoPushToken)\['),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.tempo_workspaces(id) on delete cascade,
  worker_id text,
  platform text not null check(platform in ('ios','android')),
  updated_at timestamptz not null default now()
);
alter table public.tempo_push_devices enable row level security;
revoke all on public.tempo_push_devices from anon,authenticated;
create function public.tempo_register_push(p_token text,p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.tempo_members%rowtype;
begin
  select * into m from public.tempo_members where user_id=auth.uid(); if not found then raise exception 'Sign in to your workspace first'; end if;
  perform public.tempo_require_mfa(); perform public.tempo_check_rate_limit('register_push',30,60);
  insert into public.tempo_push_devices(token,user_id,workspace_id,worker_id,platform) values(p_token,auth.uid(),m.workspace_id,m.worker_id,p_platform)
    on conflict(token) do update set user_id=excluded.user_id,workspace_id=excluded.workspace_id,worker_id=excluded.worker_id,platform=excluded.platform,updated_at=now();
end; $$;
revoke all on function public.tempo_register_push(text,text) from public,anon;
grant execute on function public.tempo_register_push(text,text) to authenticated;
create table public.tempo_push_jobs (
  notification_id uuid primary key references public.tempo_notifications(id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  attempts integer not null default 0,
  last_error text
);
alter table public.tempo_push_jobs enable row level security;
revoke all on public.tempo_push_jobs from anon,authenticated;
create function public.tempo_enqueue_push() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.tempo_push_jobs(notification_id) values(new.id) on conflict do nothing; return new; end; $$;
revoke all on function public.tempo_enqueue_push() from public,anon,authenticated;
create trigger tempo_notification_push after insert on public.tempo_notifications for each row execute function public.tempo_enqueue_push();
alter publication supabase_realtime add table public.tempo_requests;

-- A previous-day overnight slot remains available, as does an open attendance
-- record until check-out. New check-ins still obey the end-time check below.
create function public.tempo_shift_clock_available(s jsonb,punches jsonb,worker text,tz text,at_time timestamptz) returns boolean
language sql stable set search_path = '' as $$
 select s->>'date'=(at_time at time zone tz)::date::text
 or ((s->>'date')::date=(at_time at time zone tz)::date-1 and s->>'end'<s->>'start' and at_time<=(((s->>'date')::date+1+(s->>'end')::time) at time zone tz))
 or exists(select 1 from (select distinct on (p->>'workerId') p->>'type' as kind from jsonb_array_elements(punches) with ordinality as x(p,ord) where p->>'shiftId'=s->>'id' and (worker is null or p->>'workerId'=worker) order by p->>'workerId',ord desc) latest where kind='in');
$$;
revoke all on function public.tempo_shift_clock_available(jsonb,jsonb,text,text,timestamptz) from public,anon,authenticated;
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
  if not public.tempo_shift_clock_available(v_shift,v_workspace.state->'punches',null,v_workspace.time_zone,clock_timestamp()) then raise exception 'Site codes are available on the shift day'; end if;
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
  if not public.tempo_shift_clock_available(v_shift,v_workspace.state->'punches',v_member.worker_id,v_workspace.time_zone,v_at) then raise exception 'This code is for a shift on another day'; end if;
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
  if not public.tempo_shift_clock_available(v_shift,v_workspace.state->'punches',v_member.worker_id,v_workspace.time_zone,v_at) then
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

-- Remote delivery runs only on the server; clients cannot claim or send jobs.
create function public.tempo_unregister_push(p_token text) returns void language sql security definer set search_path = '' as $$
 delete from public.tempo_push_devices where token=p_token and user_id=auth.uid();
$$;
revoke all on function public.tempo_unregister_push(text) from public,anon;
grant execute on function public.tempo_unregister_push(text) to authenticated;
create table public.tempo_push_deliveries (
 id uuid primary key default gen_random_uuid(),
 notification_id uuid not null references public.tempo_notifications(id) on delete cascade,
 token text not null,
 status text not null default 'queued' check(status in ('queued','sent','delivered','failed','suppressed')),
 claimed_at timestamptz,
 attempts integer not null default 0,
 ticket text,
 sent_at timestamptz,
 checked_at timestamptz,
 error text,
 unique(notification_id,token)
);
alter table public.tempo_push_deliveries enable row level security;
revoke all on public.tempo_push_deliveries from anon,authenticated;
create function public.tempo_claim_push() returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 insert into public.tempo_push_deliveries(notification_id,token)
 select n.id,d.token from public.tempo_push_jobs j join public.tempo_notifications n on n.id=j.notification_id
 join public.tempo_push_devices d on d.workspace_id=n.workspace_id and d.worker_id=n.worker_id
 join public.tempo_members m on m.user_id=d.user_id and m.workspace_id=d.workspace_id and m.worker_id=d.worker_id and m.role='worker'
 where j.sent_at is null and n.read_at is null and n.created_at>now()-interval '24 hours' and d.updated_at>now()-interval '90 days'
 on conflict(notification_id,token) do nothing;
 update public.tempo_push_jobs set sent_at=now() where sent_at is null;
 -- A monthly roster is one alert, not dozens of interruptions on one phone.
 update public.tempo_push_deliveries d set status='suppressed',error='Coalesced' from public.tempo_notifications n
 where d.notification_id=n.id and d.status='queued' and (d.claimed_at is null or d.claimed_at<now()-interval '5 minutes')
 and exists(select 1 from public.tempo_push_deliveries newer join public.tempo_notifications next on next.id=newer.notification_id
 where newer.token=d.token and newer.status<>'failed' and (next.created_at>n.created_at or next.created_at=n.created_at and next.id>n.id));
 update public.tempo_push_deliveries set status='failed',error='RetryLimit' where status='queued' and attempts>=5 and claimed_at<now()-interval '5 minutes';
 with batch as (select d.id from public.tempo_push_deliveries d join public.tempo_push_devices device on device.token=d.token
 join public.tempo_notifications n on n.id=d.notification_id
 join public.tempo_members m on m.user_id=device.user_id and m.workspace_id=n.workspace_id and m.worker_id=n.worker_id
 where d.status='queued' and d.attempts<5 and n.read_at is null and n.created_at>now()-interval '24 hours'
 and device.workspace_id=n.workspace_id and device.worker_id=n.worker_id
 and (d.claimed_at is null or d.claimed_at<now()-interval '5 minutes')
 and not exists(select 1 from public.tempo_push_deliveries recent where recent.token=d.token and recent.id<>d.id and (recent.sent_at>now()-interval '5 minutes' or recent.claimed_at>now()-interval '5 minutes')) order by n.created_at limit 100 for update of d skip locked),
 claimed as (update public.tempo_push_deliveries d set claimed_at=now(),attempts=attempts+1 from batch where d.id=batch.id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'token',d.token,'shiftId',n.shift_id,'kind',n.kind)),'[]'::jsonb) into result from claimed d join public.tempo_notifications n on n.id=d.notification_id;
 return result;
end; $$;
create function public.tempo_finish_push(p_results jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare r jsonb; t text;
begin
 for r in select value from jsonb_array_elements(p_results) loop
 select token into t from public.tempo_push_deliveries where id=(r->>'id')::uuid;
 if r->>'error'='DeviceNotRegistered' then delete from public.tempo_push_devices where token=t; end if;
 update public.tempo_push_deliveries set status=case when r->>'ticket' is not null then 'sent' when r->>'error'='DeviceNotRegistered' or attempts>=5 then 'failed' else 'queued' end,
 ticket=r->>'ticket',sent_at=case when r->>'ticket' is not null then now() else null end,error=left(r->>'error',100) where id=(r->>'id')::uuid;
 end loop;
end; $$;
create function public.tempo_push_receipts() returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'ticket',ticket)),'[]'::jsonb) from (select id,ticket from public.tempo_push_deliveries where status='sent' and checked_at is null and sent_at<now()-interval '15 minutes' order by sent_at limit 100) pending;
$$;
create function public.tempo_finish_receipts(p_results jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare r jsonb; t text;
begin
 for r in select value from jsonb_array_elements(p_results) loop
 select token into t from public.tempo_push_deliveries where id=(r->>'id')::uuid;
 if r->>'error'='DeviceNotRegistered' then delete from public.tempo_push_devices where token=t; end if;
 update public.tempo_push_deliveries set status=case when r->>'error' is null then 'delivered' else 'failed' end,checked_at=now(),error=left(r->>'error',100) where id=(r->>'id')::uuid and status='sent';
 end loop;
 update public.tempo_push_deliveries set status='failed',checked_at=now(),error='ReceiptExpired' where status='sent' and sent_at<now()-interval '24 hours';
end; $$;
revoke all on function public.tempo_claim_push(),public.tempo_finish_push(jsonb),public.tempo_push_receipts(),public.tempo_finish_receipts(jsonb) from public,anon,authenticated;
grant usage on schema public to service_role;
grant execute on function public.tempo_claim_push(),public.tempo_finish_push(jsonb),public.tempo_push_receipts(),public.tempo_finish_receipts(jsonb) to service_role;

commit;
notify pgrst,'reload schema';
