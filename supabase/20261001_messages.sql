-- Add internal messaging between admin and workers
-- Run in the Supabase SQL Editor

begin;

create table if not exists public.tempo_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.tempo_workspaces(id) on delete cascade,
  from_role text not null,         -- 'admin' or a worker_id
  to_target text not null,         -- 'all' or a worker_id
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists tempo_messages_workspace_idx
  on public.tempo_messages(workspace_id, created_at desc);

alter table public.tempo_messages enable row level security;
revoke all on public.tempo_messages from anon, authenticated;

-- Send a message (admin or worker)
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
  v_from := case when v_member.role = 'admin' then 'admin' else v_member.worker_id end;
  insert into public.tempo_messages (workspace_id, from_role, to_target, body)
  values (v_member.workspace_id, v_from, p_to, p_body)
  returning id into v_id;
  return pg_catalog.jsonb_build_object('id', v_id, 'ok', true);
end;
$$;

-- Load messages for this user
create or replace function public.tempo_messages_snapshot()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_member public.tempo_members%rowtype;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then return '[]'::jsonb; end if;
  if v_member.role = 'admin' then
    -- Admin sees all messages
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
    -- Worker sees broadcast + their own messages
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

-- Mark message as read
create or replace function public.tempo_mark_message_read(p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_member public.tempo_members%rowtype;
begin
  select * into v_member from public.tempo_members where user_id = (select auth.uid());
  if not found then return; end if;
  update public.tempo_messages
  set read_at = now()
  where id = p_id and workspace_id = v_member.workspace_id and read_at is null;
end;
$$;

-- Enable realtime on the messages table
alter publication supabase_realtime add table public.tempo_messages;

commit;
