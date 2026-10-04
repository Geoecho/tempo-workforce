-- Shared person tasks. Photos are compressed JPEG data URIs, permission-filtered
-- with the task; no public bucket or device-local file reference is required.
create table public.tempo_tasks (
  id text primary key check (length(id) between 1 and 100),
  workspace_id uuid not null references public.tempo_workspaces(id) on delete cascade,
  worker_id text not null,
  title text not null check (length(title) between 1 and 500),
  created_at timestamptz not null default now(),
  done_at timestamptz,
  proof_uri text check (proof_uri is null or (proof_uri like 'data:image/jpeg;base64,%' and length(proof_uri) <= 2000000))
);
create index tempo_tasks_worker_idx on public.tempo_tasks(workspace_id, worker_id, created_at desc);
alter table public.tempo_tasks enable row level security;
create function public.tempo_task_can_read(p_workspace_id uuid, p_worker_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.tempo_mfa_satisfied() and exists (
    select 1 from public.tempo_members m where m.user_id = (select auth.uid()) and m.workspace_id = p_workspace_id and (m.role = 'admin' or m.worker_id = p_worker_id)
  );
$$;
revoke all on function public.tempo_task_can_read(uuid, text) from public, anon;
grant execute on function public.tempo_task_can_read(uuid, text) to authenticated;
create policy tempo_tasks_read on public.tempo_tasks for select to authenticated using (
  public.tempo_task_can_read(workspace_id, worker_id)
);
grant select on public.tempo_tasks to authenticated;
revoke insert, update, delete on public.tempo_tasks from authenticated, anon;

create function public.tempo_task_list() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_member public.tempo_members%rowtype;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then raise exception 'Sign in to your workspace first'; end if;
  perform public.tempo_require_mfa();
  return (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'workerId', t.worker_id, 'title', t.title, 'createdAt', t.created_at, 'doneAt', t.done_at, 'proofUri', t.proof_uri) order by t.created_at desc), '[]'::jsonb)
    from public.tempo_tasks t where t.workspace_id = v_member.workspace_id and (v_member.role = 'admin' or t.worker_id = v_member.worker_id));
end; $$;

create function public.tempo_task_change(p_action text, p_id text, p_worker_id text default null, p_title text default null, p_proof_uri text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_member public.tempo_members%rowtype; v_task public.tempo_tasks%rowtype;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then raise exception 'Sign in to your workspace first'; end if;
  perform public.tempo_require_mfa();
  perform public.tempo_check_rate_limit('task_change', 120, 60);
  if p_action = 'add' then
    if v_member.role <> 'admin' then raise exception 'Admin access required'; end if;
    if not exists(select 1 from public.tempo_workspaces w, jsonb_array_elements(w.state->'workers') worker where w.id = v_member.workspace_id and worker->>'id' = p_worker_id and not coalesce((worker->>'archived')::boolean, false)) then raise exception 'Worker is not available'; end if;
    if p_title is null or length(trim(p_title)) not between 1 and 500 then raise exception 'Enter a task title of up to 500 characters'; end if;
    insert into public.tempo_tasks(id, workspace_id, worker_id, title) values (p_id, v_member.workspace_id, p_worker_id, trim(p_title)) on conflict (id) do nothing;
    return;
  end if;
  select * into v_task from public.tempo_tasks where id = p_id and workspace_id = v_member.workspace_id for update;
  if not found then raise exception 'Task is no longer available'; end if;
  if p_action = 'remove' then
    if v_member.role <> 'admin' then raise exception 'Admin access required'; end if;
    delete from public.tempo_tasks where id = p_id;
  elsif p_action in ('complete', 'reopen') then
    if v_member.role <> 'worker' or v_member.worker_id <> v_task.worker_id then raise exception 'Only the assigned worker can update this task'; end if;
    if p_action = 'complete' and (p_proof_uri is null or p_proof_uri not like 'data:image/jpeg;base64,%' or length(p_proof_uri) > 2000000) then raise exception 'Attach a JPEG photo to finish this task'; end if;
    update public.tempo_tasks set done_at = case when p_action = 'complete' then now() else null end,
      proof_uri = case when p_action = 'complete' then p_proof_uri else null end where id = p_id;
  else raise exception 'Unknown task action'; end if;
end; $$;
revoke all on function public.tempo_task_list() from public, anon;
revoke all on function public.tempo_task_change(text, text, text, text, text) from public, anon;
grant execute on function public.tempo_task_list() to authenticated;
grant execute on function public.tempo_task_change(text, text, text, text, text) to authenticated;
alter publication supabase_realtime add table public.tempo_tasks;
notify pgrst, 'reload schema';
