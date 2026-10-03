// Applies every migration in supabase/ to an in-process Postgres (PGlite) with a
// minimal stand-in for Supabase's auth schema, then exercises the app's RPC flow
// and the security boundaries. Run: node --test supabase/tests/
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
// Application order. Two files share a date, so alphabetical order is wrong.
const migrations = [
  '20260929_tempo.sql',
  '20260929_ship_ready.sql',
  '20260930_paid_breaks.sql',
  '20260930_punch_cooldown.sql',
  '20261001_messages.sql',
  '20261002_checkin_window.sql',
  '20261003_security_hardening.sql',
];
test('every migration file is in the application order', () => {
  assert.deepEqual(readdirSync(dir).filter(name => name.endsWith('.sql')).sort(), [...migrations].sort());
});

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid not null, status text not null);
  grant execute on function auth.jwt() to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  create publication supabase_realtime;
`;

const ADMIN = '00000000-0000-4000-8000-00000000000a';
const WORKER = '00000000-0000-4000-8000-00000000000b';
const OTHER_WORKER = '00000000-0000-4000-8000-00000000000c';
const STRANGER = '00000000-0000-4000-8000-00000000000d';

async function setup() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const name of migrations) await db.exec(readFileSync(join(dir, name), 'utf8'));
  await db.exec(`insert into auth.users values
    ('${ADMIN}', 'admin@example.com', now()),
    ('${WORKER}', 'worker@example.com', now()),
    ('${OTHER_WORKER}', 'other@example.com', now()),
    ('${STRANGER}', 'stranger@example.com', null)`);
  return db;
}

// Runs a query as the given Supabase user (role "authenticated" with a JWT sub),
// or as "anon" when user is null. Resets to the superuser afterwards.
async function as(db, user, sql, params = [], aal = 'aal1') {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user ?? '']);
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(user ? { sub: user, role: 'authenticated', aal } : { role: 'anon' })]);
  await db.exec(`set role ${user ? 'authenticated' : 'anon'}`);
  try { return await db.query(sql, params); }
  finally { await db.exec('reset role'); }
}
const value = result => Object.values(result.rows[0])[0];
const today = async db => value(await db.query(`select (now() at time zone 'UTC')::date::text`));

async function workspaceWithWorkers(db) {
  const state = { role: 'admin', selectedWorkerId: '', currency: 'EUR', workspaceName: 'Crew', teams: [], workers: [], shifts: [], punches: [] };
  const workspaceId = value(await as(db, ADMIN, 'select public.tempo_create_workspace($1, $2)', [state, 'UTC']));
  const date = await today(db);
  const next = {
    ...state,
    workers: [
      { id: 'w1', name: 'Alex', initials: 'A', role: 'Crew', team: 'A', color: '#fff', hourlyRate: 30 },
      { id: 'w2', name: 'Sam', initials: 'S', role: 'Crew', team: 'A', color: '#fff', hourlyRate: 30 },
    ],
    shifts: [{ id: 's1', title: 'Setup', site: 'Hall', location: 'Gate', date, start: '00:00', end: '23:59', team: 'A', workerIds: ['w1', 'w2'], status: 'upcoming' }],
  };
  await as(db, ADMIN, 'select public.tempo_save_snapshot($1, 1, $2)', [workspaceId, next]);
  return workspaceId;
}

async function joinWorker(db, workspaceId, user, email, workerId) {
  await as(db, ADMIN, 'insert into public.tempo_invites (workspace_id, email, worker_id, created_by) values ($1, $2, $3, $4)', [workspaceId, email, workerId, ADMIN]);
  assert.equal(value(await as(db, user, 'select public.tempo_accept_invite()')), true);
}

// Moves a worker's latest punch back in time so the 45-second scan cooldown has passed.
async function ageLastPunch(db, workspaceId) {
  await db.query(`update public.tempo_workspaces set state = jsonb_set(state, array['punches', (jsonb_array_length(state->'punches') - 1)::text, 'at'],
    to_jsonb((now() - interval '2 minutes')::text)) where id = $1`, [workspaceId]);
}

test('full app flow still works after hardening', async () => {
  const db = await setup();
  const workspaceId = await workspaceWithWorkers(db);
  await joinWorker(db, workspaceId, WORKER, 'worker@example.com', 'w1');

  const snapshot = value(await as(db, WORKER, 'select public.tempo_snapshot()'));
  assert.equal(snapshot.state.role, 'worker');
  assert.deepEqual(snapshot.state.workers.map(w => w.id), ['w1']);

  const code = value(await as(db, ADMIN, 'select public.tempo_issue_qr($1)', ['s1']));
  assert.match(code, /^tempo:v2:/);
  const checkIn = value(await as(db, WORKER, 'select public.tempo_record_punch($1, $2)', [code, 'qr']));
  assert.equal(checkIn.type, 'in');
  await assert.rejects(as(db, WORKER, 'select public.tempo_record_punch($1, $2)', [code, 'qr']), /Please wait/);

  const breakStart = value(await as(db, WORKER, 'select public.tempo_record_break($1)', ['s1']));
  assert.equal(breakStart.message, 'Paid break started.');
  assert.equal(value(await as(db, ADMIN, 'select jsonb_array_length(public.tempo_break_snapshot())')), 1);

  await ageLastPunch(db, workspaceId);
  const code2 = value(await as(db, ADMIN, 'select public.tempo_issue_qr($1)', ['s1']));
  const checkOut = value(await as(db, WORKER, 'select public.tempo_record_punch($1, $2)', [code2, 'qr']));
  assert.equal(checkOut.type, 'out');

  assert.equal(value(await as(db, ADMIN, 'select public.tempo_review_time($1, $2::date, true)', ['w1', await today(db)])), true);
  const adminSnapshot = value(await as(db, ADMIN, 'select public.tempo_snapshot()'));
  assert.equal(adminSnapshot.approvals.length, 1);
  assert.equal(adminSnapshot.state.punches.length, 2);

  // Shift change → worker notification → mark read
  const changed = { ...adminSnapshot.state, shifts: adminSnapshot.state.shifts.map(s => ({ ...s, site: 'New hall' })) };
  await as(db, ADMIN, 'select public.tempo_save_snapshot($1, $2, $3)', [workspaceId, adminSnapshot.version, changed]);
  const notifications = value(await as(db, WORKER, 'select public.tempo_snapshot()')).notifications;
  assert.ok(notifications.length >= 1);
  assert.equal(value(await as(db, WORKER, 'select public.tempo_mark_notification_read($1)', [notifications[0].id])), true);
});

test('ended shifts refuse check-in but still allow check-out', async () => {
  const db = await setup();
  const workspaceId = await workspaceWithWorkers(db);
  await joinWorker(db, workspaceId, WORKER, 'worker@example.com', 'w1');
  const code = value(await as(db, ADMIN, 'select public.tempo_issue_qr($1)', ['s1']));
  await as(db, WORKER, 'select public.tempo_record_punch($1, $2)', [code, 'qr']);
  await ageLastPunch(db, workspaceId);
  await db.query(`update public.tempo_workspaces set state = jsonb_set(jsonb_set(state, '{shifts,0,start}', '"00:00"'), '{shifts,0,end}', '"00:01"') where id = $1`, [workspaceId]);
  assert.equal(value(await as(db, WORKER, 'select public.tempo_record_punch($1, $2)', [code, 'qr'])).type, 'out');
  await ageLastPunch(db, workspaceId);
  await assert.rejects(as(db, WORKER, 'select public.tempo_record_punch($1, $2)', [code, 'qr']), /This shift has ended/);
  await db.close();
});

test('messages: valid conversations work, invalid recipients and bodies are refused', async () => {
  const db = await setup();
  const workspaceId = await workspaceWithWorkers(db);
  await joinWorker(db, workspaceId, WORKER, 'worker@example.com', 'w1');
  await joinWorker(db, workspaceId, OTHER_WORKER, 'other@example.com', 'w2');

  await as(db, ADMIN, 'select public.tempo_send_message($1, $2)', ['all', 'Hello team']);
  const toW1 = value(await as(db, ADMIN, 'select public.tempo_send_message($1, $2)', ['w1', 'Private to w1'])).id;
  await as(db, WORKER, 'select public.tempo_send_message($1, $2)', ['admin', 'Hi admin']);
  await as(db, WORKER, 'select public.tempo_send_message($1, $2)', ['all', 'Hi all']);

  await assert.rejects(as(db, WORKER, 'select public.tempo_send_message($1, $2)', ['w2', 'direct']), /valid recipient/);
  await assert.rejects(as(db, ADMIN, 'select public.tempo_send_message($1, $2)', ['nobody', 'x']), /valid recipient/);
  await assert.rejects(as(db, WORKER, 'select public.tempo_send_message($1, $2)', ['all', '   ']), /empty/);
  await assert.rejects(as(db, WORKER, 'select public.tempo_send_message($1, $2)', ['all', 'x'.repeat(4001)]), /too long/);

  const w1Messages = value(await as(db, WORKER, 'select public.tempo_messages_snapshot()'));
  assert.equal(w1Messages.length, 4);
  const w2Messages = value(await as(db, OTHER_WORKER, 'select public.tempo_messages_snapshot()'));
  assert.ok(!w2Messages.some(m => m.body === 'Private to w1'));

  // w2 cannot mark w1's private message read; w1 can.
  await as(db, OTHER_WORKER, 'select public.tempo_mark_message_read($1)', [toW1]);
  assert.equal(value(await db.query('select read_at from public.tempo_messages where id = $1', [toW1])), null);
  await as(db, WORKER, 'select public.tempo_mark_message_read($1)', [toW1]);
  assert.notEqual(value(await db.query('select read_at from public.tempo_messages where id = $1', [toW1])), null);
});

test('rate limit returns PT429 after the limit and resets after the window', async () => {
  const db = await setup();
  await workspaceWithWorkers(db);
  for (let i = 0; i < 30; i++) await as(db, ADMIN, 'select public.tempo_send_message($1, $2)', ['all', `m${i}`]);
  await assert.rejects(as(db, ADMIN, 'select public.tempo_send_message($1, $2)', ['all', 'one too many']),
    error => error.code === 'PT429' && /Too many requests/.test(error.message));
  await assert.rejects(as(db, ADMIN, 'select public.tempo_send_message($1, $2)', ['all', 'still limited']), { code: 'PT429' });
  await db.query(`update public.tempo_rate_limits set window_start = now() - interval '2 minutes'`);
  await as(db, ADMIN, 'select public.tempo_send_message($1, $2)', ['all', 'after window']);
});

test('invites: created_by must be the caller and the worker must exist', async () => {
  const db = await setup();
  const workspaceId = await workspaceWithWorkers(db);
  await assert.rejects(as(db, ADMIN, 'insert into public.tempo_invites (workspace_id, email, worker_id, created_by) values ($1, $2, $3, $4)',
    [workspaceId, 'x@example.com', 'w1', WORKER]), /row-level security/);
  await assert.rejects(as(db, ADMIN, 'insert into public.tempo_invites (workspace_id, email, worker_id, created_by) values ($1, $2, $3, $4)',
    [workspaceId, 'x@example.com', 'ghost', ADMIN]), /active worker/);
  await assert.rejects(as(db, ADMIN, 'insert into public.tempo_invites (workspace_id, email, worker_id, created_by) values ($1, $2, $3, $4)',
    [workspaceId, 'not-an-email', 'w1', ADMIN]), /tempo_invites_email_format/);
  // Upsert (the app's re-invite path) still works.
  const upsert = `insert into public.tempo_invites (workspace_id, email, worker_id, created_by) values ($1, $2, $3, $4)
    on conflict (workspace_id, email) do update set worker_id = excluded.worker_id, created_by = excluded.created_by`;
  await as(db, ADMIN, upsert, [workspaceId, 'x@example.com', 'w1', ADMIN]);
  await as(db, ADMIN, upsert, [workspaceId, 'x@example.com', 'w2', ADMIN]);
  // A non-admin cannot see or write invites.
  assert.equal((await as(db, STRANGER, 'select * from public.tempo_invites')).rows.length, 0);
});

test('privilege boundaries', async () => {
  const db = await setup();
  const workspaceId = await workspaceWithWorkers(db);
  await joinWorker(db, workspaceId, WORKER, 'worker@example.com', 'w1');

  await assert.rejects(as(db, null, 'select public.tempo_snapshot()'), /permission denied/);
  await assert.rejects(as(db, ADMIN, `select public.tempo_check_rate_limit('x', 1, 1)`), /permission denied/);
  await assert.rejects(as(db, ADMIN, 'select * from public.tempo_rate_limits'), /permission denied/);
  await assert.rejects(as(db, ADMIN, 'select * from public.tempo_workspaces'), /permission denied/);
  await assert.rejects(as(db, WORKER, 'select public.tempo_issue_qr($1)', ['s1']), /Admin access required/);
  await assert.rejects(as(db, WORKER, 'select public.tempo_save_snapshot($1, 2, $2)', [workspaceId, { workers: [], shifts: [], punches: [] }]), /Admin access required/);
  await assert.rejects(as(db, ADMIN, 'select public.tempo_record_punch($1, $2)', ['tempo:v2:x', 'qr']), /Worker access required/);
  await assert.rejects(as(db, WORKER, 'select public.tempo_record_punch($1, $2)', ['tempo:v2:' + 'a'.repeat(100), 'qr']), /invalid or has expired/);
  // An unconfirmed email cannot claim an invite.
  await as(db, ADMIN, 'insert into public.tempo_invites (workspace_id, email, worker_id, created_by) values ($1, $2, $3, $4)', [workspaceId, 'stranger@example.com', 'w2', ADMIN]);
  assert.equal(value(await as(db, STRANGER, 'select public.tempo_accept_invite()')), false);
});

test('oversized workspace state is refused', async () => {
  const db = await setup();
  const big = { workers: [], shifts: [], punches: [], padding: 'x'.repeat(1_200_000) };
  await assert.rejects(as(db, ADMIN, 'select public.tempo_create_workspace($1, $2)', [big, 'UTC']), /too large/);
});

test('an account with verified MFA needs an aal2 session for every RPC', async () => {
  const db = await setup();
  const workspaceId = await workspaceWithWorkers(db);
  await joinWorker(db, workspaceId, WORKER, 'worker@example.com', 'w1');
  await db.query(`insert into auth.mfa_factors (user_id, status) values ($1, 'verified')`, [ADMIN]);

  for (const sql of [
    'select public.tempo_snapshot()',
    'select public.tempo_break_snapshot()',
    'select public.tempo_messages_snapshot()',
    `select public.tempo_issue_qr('s1')`,
    `select public.tempo_send_message('all', 'x')`,
  ]) await assert.rejects(as(db, ADMIN, sql), error => error.code === 'PT403', sql);
  // RLS on invites goes through tempo_is_admin, so an aal1 admin sees and writes nothing.
  assert.equal((await as(db, ADMIN, 'select * from public.tempo_invites')).rows.length, 0);

  const snapshot = value(await as(db, ADMIN, 'select public.tempo_snapshot()', [], 'aal2'));
  assert.equal(snapshot.state.role, 'admin');
  await as(db, ADMIN, `select public.tempo_issue_qr('s1')`, [], 'aal2');
  // Accounts without MFA are unaffected by an aal1 session.
  assert.equal(value(await as(db, WORKER, 'select public.tempo_snapshot()')).state.role, 'worker');
  // An unverified (abandoned) enrolment does not lock the account.
  await db.query(`insert into auth.mfa_factors (user_id, status) values ($1, 'unverified')`, [WORKER]);
  assert.equal(value(await as(db, WORKER, 'select public.tempo_snapshot()')).state.role, 'worker');
});

test('profile photos: inline images and unchanged values pass, external URLs are refused', async () => {
  const db = await setup();
  const workspaceId = await workspaceWithWorkers(db);
  const save = async (photoUri, version) => {
    const current = value(await as(db, ADMIN, 'select public.tempo_snapshot()'));
    const state = { ...current.state, workers: current.state.workers.map(w => w.id === 'w1' ? { ...w, photoUri } : w) };
    return as(db, ADMIN, 'select public.tempo_save_snapshot($1, $2, $3)', [workspaceId, version ?? current.version, state]);
  };
  await save('data:image/jpeg;base64,/9j/4AAQSkZJRg==');
  await assert.rejects(save('https://tracker.example.com/pixel.png'), /Profile photos must be added from the app/);
  await assert.rejects(save('data:image/svg+xml;base64,PHN2Zz4='), /Profile photos must be added from the app/);
  // A legacy non-inline value already stored is kept when other fields change.
  await db.query(`update public.tempo_workspaces set state = jsonb_set(state, '{workers,0,photoUri}', '"file:///legacy.jpg"') where id = $1`, [workspaceId]);
  const current = value(await as(db, ADMIN, 'select public.tempo_snapshot()'));
  await as(db, ADMIN, 'select public.tempo_save_snapshot($1, $2, $3)', [workspaceId, current.version, { ...current.state, workspaceName: 'Renamed' }]);
  await save(undefined);
});
