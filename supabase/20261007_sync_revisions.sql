-- Small, tenant-scoped change counters. Apply after 20261004_task_completion.sql.
-- Existing workspace JSON and all existing records remain untouched.
begin;

create table public.tempo_sync_revisions (
  workspace_id uuid not null references public.tempo_workspaces(id) on delete cascade,
  section text not null check (section in ('workspace', 'meta', 'breaks', 'messages', 'tasks', 'requests')),
  revision bigint not null default 0,
  primary key (workspace_id, section)
);

insert into public.tempo_sync_revisions(workspace_id, section)
select w.id, section.name
from public.tempo_workspaces w
cross join (values ('workspace'), ('meta'), ('breaks'), ('messages'), ('tasks'), ('requests')) as section(name)
on conflict do nothing;

alter table public.tempo_sync_revisions enable row level security;
revoke all on public.tempo_sync_revisions from public, anon, authenticated;
create policy tempo_sync_revisions_member on public.tempo_sync_revisions
  for select to authenticated using (
    public.tempo_mfa_satisfied() and exists (
      select 1 from public.tempo_members m
      where m.user_id = (select auth.uid()) and m.workspace_id = tempo_sync_revisions.workspace_id
    )
  );
grant select on public.tempo_sync_revisions to authenticated;

create function public.tempo_bump_sync_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_workspace_id uuid;
begin
  if TG_TABLE_NAME = 'tempo_workspaces' then
    v_workspace_id := case when TG_OP = 'DELETE' then OLD.id else NEW.id end;
  else
    v_workspace_id := case when TG_OP = 'DELETE' then OLD.workspace_id else NEW.workspace_id end;
  end if;
  -- Cascading workspace deletion must not recreate a child revision row.
  if not exists (select 1 from public.tempo_workspaces w where w.id = v_workspace_id) then
    if TG_OP = 'DELETE' then return OLD; end if;
    return NEW;
  end if;
  insert into public.tempo_sync_revisions(workspace_id, section, revision)
  values (v_workspace_id, TG_ARGV[0], 1)
  on conflict (workspace_id, section) do update
    set revision = public.tempo_sync_revisions.revision + 1;
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;
revoke all on function public.tempo_bump_sync_revision() from public, anon, authenticated;

create trigger tempo_break_sync_revision after insert or update or delete on public.tempo_break_events
  for each row execute function public.tempo_bump_sync_revision('breaks');
create trigger tempo_workspace_sync_revision after insert or update of state, version on public.tempo_workspaces
  for each row execute function public.tempo_bump_sync_revision('workspace');
create trigger tempo_message_sync_revision after insert or update or delete on public.tempo_messages
  for each row execute function public.tempo_bump_sync_revision('messages');
create trigger tempo_notification_sync_revision after insert or update or delete on public.tempo_notifications
  for each row execute function public.tempo_bump_sync_revision('meta');
create trigger tempo_approval_sync_revision after insert or update or delete on public.tempo_time_approvals
  for each row execute function public.tempo_bump_sync_revision('meta');
create trigger tempo_task_sync_revision after insert or update or delete on public.tempo_tasks
  for each row execute function public.tempo_bump_sync_revision('tasks');
create trigger tempo_request_sync_revision after insert or update or delete on public.tempo_requests
  for each row execute function public.tempo_bump_sync_revision('requests');

create function public.tempo_sync_versions() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_workspace_id uuid; v_workspace_version bigint; v_sections jsonb;
begin
  select m.workspace_id into v_workspace_id
  from public.tempo_members m where m.user_id = (select auth.uid());
  if v_workspace_id is null then return null; end if;
  perform public.tempo_require_mfa();
  select w.version into v_workspace_version
  from public.tempo_workspaces w where w.id = v_workspace_id;
  select coalesce(jsonb_object_agg(r.section, r.revision), '{}'::jsonb) into v_sections
  from public.tempo_sync_revisions r where r.workspace_id = v_workspace_id;
  return jsonb_build_object('workspaceId', v_workspace_id,
    'workspaceVersion', v_workspace_version, 'sections', v_sections);
end;
$$;
revoke all on function public.tempo_sync_versions() from public, anon;
grant execute on function public.tempo_sync_versions() to authenticated;

-- Approvals and notifications are already relational. Refresh them without
-- reading the workspace JSON after an unrelated metadata change.
create function public.tempo_meta_snapshot() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_member public.tempo_members%rowtype; v_notifications jsonb; v_approvals jsonb;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then return null; end if;
  perform public.tempo_require_mfa();
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id, 'workerId', n.worker_id, 'shiftId', n.shift_id,
    'kind', n.kind, 'title', n.title, 'body', n.body,
    'createdAt', n.created_at, 'readAt', n.read_at
  ) order by n.created_at desc), '[]'::jsonb) into v_notifications
  from public.tempo_notifications n
  where n.workspace_id = v_member.workspace_id
    and ((v_member.role = 'worker' and n.worker_id = v_member.worker_id)
      or (v_member.role = 'admin' and n.worker_id = '@admin:' || v_member.user_id::text));
  select coalesce(jsonb_agg(jsonb_build_object(
    'workerId', a.worker_id, 'date', a.work_date,
    'approvedBy', a.approved_by, 'approvedAt', a.approved_at
  )), '[]'::jsonb) into v_approvals
  from public.tempo_time_approvals a
  where a.workspace_id = v_member.workspace_id
    and (v_member.role = 'admin' or a.worker_id = v_member.worker_id);
  return jsonb_build_object('notifications', v_notifications, 'approvals', v_approvals);
end;
$$;
revoke all on function public.tempo_meta_snapshot() from public, anon;
grant execute on function public.tempo_meta_snapshot() to authenticated;

-- Keep the original task-list RPC for older clients. New clients use this
-- compact list and fetch one authorized proof only when it is opened.
create function public.tempo_task_list_compact() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_member public.tempo_members%rowtype;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then raise exception 'Sign in to your workspace first'; end if;
  perform public.tempo_require_mfa();
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'workerId', t.worker_id, 'title', t.title,
    'createdAt', t.created_at, 'doneAt', t.done_at,
    'hasProof', t.proof_uri is not null
  ) order by t.created_at desc, t.id desc), '[]'::jsonb)
    from public.tempo_tasks t where t.workspace_id = v_member.workspace_id
      and (v_member.role = 'admin' or t.worker_id = v_member.worker_id));
end;
$$;
revoke all on function public.tempo_task_list_compact() from public, anon;
grant execute on function public.tempo_task_list_compact() to authenticated;

create function public.tempo_task_proof(p_id text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare v_member public.tempo_members%rowtype; v_proof text;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then return null; end if;
  perform public.tempo_require_mfa();
  select t.proof_uri into v_proof from public.tempo_tasks t
  where t.id = p_id and t.workspace_id = v_member.workspace_id
    and (v_member.role = 'admin' or t.worker_id = v_member.worker_id);
  return v_proof;
end;
$$;
revoke all on function public.tempo_task_proof(text) from public, anon;
grant execute on function public.tempo_task_proof(text) to authenticated;

alter publication supabase_realtime add table public.tempo_sync_revisions;
notify pgrst, 'reload schema';
commit;
