import type { Session } from '@supabase/supabase-js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '../ui/LocalizedText';
import { AuthScreen } from '../ui/AuthScreen';
import { PasswordRecovery } from '../ui/PasswordRecovery';
import { WorkspaceSetup } from '../ui/WorkspaceSetup';
import { useTheme } from '../ui/theme';
import { BreakEvent, Currency, initialState, newWorkspaceState, paySummary, Punch, Shift, ShiftNotification, State, TimeApproval, teamNames, today, uid, Worker } from './data';
import { Context, Result } from './store-context';
import { recoveryRedirect, supabase } from './supabase';

type Snapshot = { workspaceId: string; version: number; state: State; notifications?: ShiftNotification[]; approvals?: TimeApproval[] };
const client = supabase!;

export function OnlineStoreProvider({ children }: { children: React.ReactNode }) {
  const C = useTheme().colors;
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [state, setState] = useState<State>(initialState);
  const [notifications, setNotifications] = useState<ShiftNotification[]>([]);
  const [approvals, setApprovals] = useState<TimeApproval[]>([]);
  const [breaks, setBreaks] = useState<BreakEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [waitingForInvite, setWaitingForInvite] = useState(false);
  const [needsWorkspaceSetup, setNeedsWorkspaceSetup] = useState(false);
  const [recoveringPassword, setRecoveringPassword] = useState(recoveryRedirect);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const stateRef = useRef(state);
  const versionRef = useRef(0);
  const pendingRef = useRef(0);
  const generationRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const userId = session?.user.id;
  const accountIntent = session?.user.user_metadata.tempo_intent;

  useEffect(() => {
    client.auth.getSession().then(({ data }) => setSession(data.session)).finally(() => setAuthReady(true));
    const { data: { subscription } } = client.auth.onAuthStateChange((event, current) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveringPassword(true);
      setSession(current);
      if (!current) { setReady(false); setWorkspaceId(''); setRecoveringPassword(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadSnapshot = useCallback(async (): Promise<State | null> => {
    const [{ data, error }, { data: breakData, error: breakError }] = await Promise.all([client.rpc('tempo_snapshot'), client.rpc('tempo_break_snapshot')]);
    if (error) throw error;
    if (breakError) throw breakError;
    if (!data) return null;
    const snapshot = data as Snapshot;
    versionRef.current = snapshot.version;
    stateRef.current = snapshot.state;
    setState(snapshot.state);
    setNotifications(snapshot.notifications ?? []);
    setApprovals(snapshot.approvals ?? []);
    setBreaks((breakData as BreakEvent[] | null) ?? []);
    setWorkspaceId(snapshot.workspaceId);
    return snapshot.state;
  }, []);

  const bootstrap = useCallback(async () => {
    setLoadError(null);
    setWaitingForInvite(false);
    setNeedsWorkspaceSetup(false);
    try {
      const { error: inviteError } = await client.rpc('tempo_accept_invite');
      if (inviteError) throw inviteError;
      let current = await loadSnapshot();
      if (!current && accountIntent === 'worker') {
        setWaitingForInvite(true);
        return;
      }
      if (!current) {
        setNeedsWorkspaceSetup(true);
        return;
      }
      if (!current) throw new Error('Workspace could not be loaded.');
      setReady(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not connect to the workspace.');
    }
  }, [loadSnapshot, accountIntent]);

  const createWorkspace = async (name: string) => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const { error } = await client.rpc('tempo_create_workspace', { p_state: newWorkspaceState(name), p_time_zone: timeZone });
    if (error) throw error;
    const current = await loadSnapshot();
    if (!current) throw new Error('Workspace could not be loaded.');
    setNeedsWorkspaceSetup(false);
    setReady(true);
  };

  useEffect(() => {
    if (userId) void Promise.resolve().then(bootstrap);
  }, [userId, bootstrap]);

  useEffect(() => {
    if (!ready || !workspaceId) return;
    const timer = setInterval(() => {
      if (pendingRef.current === 0) void loadSnapshot().catch(error =>
        setSyncError(error instanceof Error ? error.message : 'Could not refresh shared data.')
      );
    }, 12000);
    return () => clearInterval(timer);
  }, [ready, workspaceId, loadSnapshot]);

  const commit = (update: (current: State) => State) => {
    if (stateRef.current.role !== 'admin' || !workspaceId) return;
    const next = update(stateRef.current);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setState(next);
    const generation = generationRef.current;
    pendingRef.current++;
    queueRef.current = queueRef.current
      .then(async () => {
        if (generation !== generationRef.current) return;
        const { data, error } = await client.rpc('tempo_save_snapshot', {
          p_workspace_id: workspaceId,
          p_expected_version: versionRef.current,
          p_state: next,
        });
        if (error) throw error;
        versionRef.current = Number(data);
        setSyncError(null);
      })
      .catch(async error => {
        generationRef.current++;
        setSyncError(error instanceof Error ? error.message : 'Could not save shared data.');
        try { await loadSnapshot(); } catch { /* Keep the original save error visible. */ }
      })
      .finally(() => { pendingRef.current--; });
  };

  const addTeam = (rawName: string) => commit(s => {
    const name = rawName.trim();
    return !name || teamNames(s).some(team => team.toLowerCase() === name.toLowerCase())
      ? s : { ...s, teams: [...(s.teams ?? []), name] };
  });
  const addWorker = (worker: Omit<Worker, 'id' | 'initials' | 'color'>) => commit(s => {
    const id = uid();
    return { ...s, workers: [...s.workers, { ...worker, id, initials: worker.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase(), color: '#DDEBE5' }], selectedWorkerId: s.selectedWorkerId || id };
  });
  const updateWorker = (id: string, changes: Partial<Pick<Worker, 'name' | 'role' | 'team' | 'phone' | 'photoUri' | 'hourlyRate'>>) =>
    commit(s => ({ ...s, workers: s.workers.map(w => w.id === id ? { ...w, ...changes, initials: changes.name ? changes.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase() : w.initials } : w) }));
  const removeWorker = (id: string) => commit(s => {
    if (s.shifts.some(shift => [...s.punches].reverse().find(p => p.workerId === id && p.shiftId === shift.id)?.type === 'in')) return s;
    const hasHistory = s.punches.some(p => p.workerId === id);
    const workers = hasHistory ? s.workers.map(w => w.id === id ? { ...w, archived: true } : w) : s.workers.filter(w => w.id !== id);
    return { ...s, workers, selectedWorkerId: s.selectedWorkerId === id ? (workers.find(w => !w.archived)?.id ?? '') : s.selectedWorkerId, shifts: s.shifts.map(shift => ({ ...shift, workerIds: shift.workerIds.filter(workerId => workerId !== id) })) };
  });
  const restoreWorker = (id: string) => commit(s => ({ ...s, workers: s.workers.map(w => w.id === id ? { ...w, archived: false } : w) }));
  const setCurrency = (currency: Currency) => commit(s => s.punches.length ? s : ({ ...s, currency }));
  const setWorkspaceName = (rawName: string) => commit(s => rawName.trim() ? { ...s, workspaceName: rawName.trim() } : s);
  const addShift = (shift: Omit<Shift, 'id' | 'status'>) => commit(s => ({ ...s, shifts: [{ ...shift, id: uid(), status: 'upcoming' }, ...s.shifts] }));
  const addShifts = (shifts: Omit<Shift, 'id' | 'status'>[]) => commit(s => ({ ...s, shifts: [...shifts.map(shift => ({ ...shift, id: uid(), status: 'upcoming' as const })), ...s.shifts] }));
  const updateShift = (id: string, changes: Partial<Pick<Shift, 'title' | 'site' | 'location' | 'latitude' | 'longitude' | 'date' | 'start' | 'end' | 'team' | 'workerIds'>>) => commit(s => ({
    ...s, shifts: s.shifts.map(shift => shift.id !== id ? shift : { ...shift, ...changes, ...(s.punches.some(p => p.shiftId === id) ? { date: shift.date, workerIds: shift.workerIds } : {}) }),
  }));
  const removeShift = (id: string) => commit(s => {
    if (s.workers.some(w => [...s.punches].reverse().find(p => p.workerId === w.id && p.shiftId === id)?.type === 'in')) return s;
    return { ...s, shifts: s.punches.some(p => p.shiftId === id) ? s.shifts.map(shift => shift.id === id ? { ...shift, archived: true } : shift) : s.shifts.filter(shift => shift.id !== id) };
  });
  const restoreShift = (id: string) => commit(s => ({ ...s, shifts: s.shifts.map(shift => shift.id === id ? { ...shift, archived: false } : shift) }));

  const scan = async (payload: string, source: Punch['source'] = 'qr'): Promise<Result> => {
    const { data, error } = await client.rpc('tempo_record_punch', { p_payload: payload, p_source: source });
    if (error) return { ok: false, message: error.message };
    try {
      const fresh = await loadSnapshot();
      const worker = fresh?.workers.find(w => w.id === fresh.selectedWorkerId);
      return { ...(data as Result), ...(worker && (data as Result).type === 'out' ? { pay: paySummary(fresh!.punches, worker, today()) } : {}) };
    } catch {
      return data as Result;
    }
  };
  const toggleBreak = async (shiftId: string): Promise<Result> => {
    const { data, error } = await client.rpc('tempo_record_break', { p_shift_id: shiftId });
    if (error) return { ok: false, message: error.message };
    await loadSnapshot();
    return data as Result;
  };

  const issueQr = useCallback(async (shiftId: string): Promise<string> => {
    const { data, error } = await client.rpc('tempo_issue_qr', { p_shift_id: shiftId });
    if (error) throw error;
    return String(data);
  }, []);
  const markNotificationRead = async (id: string): Promise<void> => {
    const { error } = await client.rpc('tempo_mark_notification_read', { p_id: id });
    if (error) throw error;
    setNotifications(current => current.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
  };
  const reviewTime = async (workerId: string, date: string, approve: boolean): Promise<Result> => {
    const { error } = await client.rpc('tempo_review_time', { p_worker_id: workerId, p_date: date, p_approve: approve });
    if (error) return { ok: false, message: error.message };
    await loadSnapshot();
    return { ok: true, message: approve ? 'Time approved.' : 'Approval removed.' };
  };

  const inviteWorker = async (workerId: string, email: string): Promise<Result> => {
    if (stateRef.current.role !== 'admin' || !workspaceId) return { ok: false, message: 'Admin access required.' };
    if (!stateRef.current.workers.some(w => w.id === workerId && !w.archived)) return { ok: false, message: 'Choose an active worker.' };
    const normalized = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) return { ok: false, message: 'Enter a valid email address.' };
    const { error } = await client.from('tempo_invites').upsert({
      workspace_id: workspaceId, worker_id: workerId, email: normalized, created_by: session!.user.id,
    });
    return error ? { ok: false, message: error.message } : { ok: true, message: 'Invitation saved. Share the join instructions below with this worker.' };
  };

  if (!authReady) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={C.green} /></View>;
  if (!session) return <AuthScreen />;
  if (recoveringPassword) return <PasswordRecovery email={session.user.email ?? ''} onComplete={() => { setRecoveringPassword(false); void bootstrap(); }} />;
  if (needsWorkspaceSetup) return <WorkspaceSetup email={session.user.email ?? ''} onCreate={createWorkspace} onSignOut={async () => { await client.auth.signOut(); }} />;
  if (!ready) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, padding: 25 }}>
    {loadError || waitingForInvite ? <>
      <Text style={{ color: C.ink, fontSize: 19, fontWeight: '700', textAlign: 'center' }}>{waitingForInvite ? 'Waiting for your invitation' : 'Could not load workspace'}</Text>
      <Text style={{ color: C.muted, marginTop: 10, textAlign: 'center', lineHeight: 20 }}>{waitingForInvite ? 'Ask your admin to invite this email to a worker profile.' : loadError}</Text>
      <Pressable onPress={() => void bootstrap()} style={{ marginTop: 22, padding: 12 }}><Text style={{ color: C.green, fontWeight: '700' }}>Try again</Text></Pressable>
      <Pressable onPress={() => void client.auth.signOut()} style={{ padding: 12 }}><Text style={{ color: C.red }}>Sign out</Text></Pressable>
    </> : <ActivityIndicator color={C.green} />}
  </View>;

  return <Context.Provider value={{
    ...state, ready, online: true, syncError, accountEmail: session.user.email ?? null, notifications, approvals, breaks, messages: [],
    setRole: () => {}, setSelectedWorker: () => {}, addTeam,
    addWorker, updateWorker, removeWorker, restoreWorker, setCurrency, setWorkspaceName,
    addShift, addShifts, updateShift, removeShift, restoreShift, scan, toggleBreak, issueQr, markNotificationRead, reviewTime, sendMessage: async () => ({ ok: false, message: 'Not implemented online' }), markMessageRead: async () => {}, reset: () => {},
    inviteWorker, signOut: async () => { await client.auth.signOut(); },
  }}>{children}</Context.Provider>;
}
