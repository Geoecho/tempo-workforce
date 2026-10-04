-- One private completion alert per task per admin. Repeated completion/reopen cannot spam the inbox.
begin;
alter table public.tempo_notifications drop constraint tempo_notifications_kind_check;
alter table public.tempo_notifications add constraint tempo_notifications_kind_check check(kind in ('assigned','changed','removed','task-completed'));
create unique index tempo_task_completion_once on public.tempo_notifications(workspace_id,worker_id,shift_id) where kind='task-completed';
create function public.tempo_task_completed_alert() returns trigger language plpgsql security definer set search_path='' as $$
declare person text;
begin
 if old.done_at is null and new.done_at is not null then
  select w->>'name' into person from public.tempo_workspaces ws, jsonb_array_elements(ws.state->'workers') w where ws.id=new.workspace_id and w->>'id'=new.worker_id;
  insert into public.tempo_notifications(workspace_id,worker_id,shift_id,kind,title,body)
  select new.workspace_id,'@admin:' || m.user_id::text,'task:' || new.id,'task-completed','Task completed',coalesce(person,'Worker') || ' · ' || new.title
  from public.tempo_members m where m.workspace_id=new.workspace_id and m.role='admin'
  on conflict do nothing;
 end if;
 return new;
end; $$;
revoke all on function public.tempo_task_completed_alert() from public,anon,authenticated;
create trigger tempo_task_completed after update of done_at on public.tempo_tasks for each row execute function public.tempo_task_completed_alert();
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
  where n.workspace_id = v_workspace.id and ((v_member.role = 'worker' and n.worker_id = v_member.worker_id) or (v_member.role = 'admin' and n.worker_id = '@admin:' || v_member.user_id::text));
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
create or replace function public.tempo_mark_notification_read(p_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_member public.tempo_members%rowtype;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then raise exception 'Workspace access required'; end if;
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('mark_notification_read', 600, 60);
  update public.tempo_notifications set read_at = coalesce(read_at, clock_timestamp())
    where id = p_id and workspace_id = v_member.workspace_id and worker_id = case when v_member.role='admin' then '@admin:' || v_member.user_id::text else v_member.worker_id end;
  return found;
end;
$$;
create or replace function public.tempo_claim_push() returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 insert into public.tempo_push_deliveries(notification_id,token)
 select n.id,d.token from public.tempo_push_jobs j join public.tempo_notifications n on n.id=j.notification_id
 join public.tempo_push_devices d on d.workspace_id=n.workspace_id
 join public.tempo_members m on m.user_id=d.user_id and m.workspace_id=d.workspace_id and ((m.role='worker' and d.worker_id=n.worker_id and m.worker_id=d.worker_id) or (m.role='admin' and n.worker_id='@admin:' || m.user_id::text))
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
 join public.tempo_members m on m.user_id=device.user_id and m.workspace_id=n.workspace_id and ((m.role='worker' and m.worker_id=n.worker_id and device.worker_id=n.worker_id) or (m.role='admin' and n.worker_id='@admin:' || m.user_id::text))
 where d.status='queued' and d.attempts<5 and n.read_at is null and n.created_at>now()-interval '24 hours'
 and device.workspace_id=n.workspace_id
 and (d.claimed_at is null or d.claimed_at<now()-interval '5 minutes')
 and not exists(select 1 from public.tempo_push_deliveries recent where recent.token=d.token and recent.id<>d.id and (recent.sent_at>now()-interval '5 minutes' or recent.claimed_at>now()-interval '5 minutes')) order by n.created_at limit 100 for update of d skip locked),
 claimed as (update public.tempo_push_deliveries d set claimed_at=now(),attempts=attempts+1 from batch where d.id=batch.id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'token',d.token,'shiftId',n.shift_id,'kind',n.kind)),'[]'::jsonb) into result from claimed d join public.tempo_notifications n on n.id=d.notification_id;
 return result;
end; $$;
notify pgrst,'reload schema';
commit;
