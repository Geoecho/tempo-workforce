import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Task } from './extras';
import { supabase } from './supabase';

function taskError(error: { code?: string; message?: string }) {
  if (error.code === 'PGRST202' || error.code === '42P01') return 'Shared tasks are not enabled yet. Ask an admin to apply the task database update.';
  return error.code === 'P0001' || error.code?.startsWith('PT') ? error.message ?? 'Could not save this task. Please try again.' : 'Could not sync tasks. Check your connection and try again.';
}
const isForeground = () => Platform.OS === 'web'
  ? typeof document === 'undefined' || document.visibilityState === 'visible'
  : AppState.currentState === 'active';

export function useSharedTasks(enabled: boolean, account: string | null, admin: boolean, localReady: boolean, legacy: Task[]) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const generation = useRef(0);
  const revisionRef = useRef<number | null>(null);
  const legacyRef = useRef(legacy);
  useEffect(() => { legacyRef.current = legacy; }, [legacy]);
  const load = useCallback(async () => {
    if (!enabled || !supabase) return;
    const scope = generation.current;
    let { data, error: failure } = await supabase.rpc('tempo_task_list_compact');
    if (failure?.code === 'PGRST202' || failure?.code === '42883') {
      ({ data, error: failure } = await supabase.rpc('tempo_task_list'));
    }
    if (scope !== generation.current) return;
    if (failure) { setError(taskError(failure)); setReady(true); return false; }
    setTasks(data ?? []); setError(''); setReady(true);
    return true;
  }, [enabled]);
  const checkRevision = useCallback(async () => {
    if (!enabled || !supabase) return;
    const { data, error } = await supabase.rpc('tempo_sync_versions');
    if (error || !data) { await load(); return; }
    const revision = Number(data.sections?.tasks ?? 0);
    if (revision !== revisionRef.current && await load()) revisionRef.current = revision;
  }, [enabled, load]);
  useEffect(() => {
    generation.current++;
    revisionRef.current = null;
    if (!enabled || !supabase || !localReady) return;
    const scope = generation.current;
    const client = supabase;
    const start = async () => {
      await Promise.resolve();
      if (scope !== generation.current) return;
      setTasks([]); setError(''); setReady(false);
      try {
        // Existing admin-created tasks keep their IDs, so a retry cannot duplicate them.
        const key = `tempo-tasks-imported:${account}`;
        if (admin && !await AsyncStorage.getItem(key)) {
          for (const task of legacyRef.current) {
            const { error: failure } = await client.rpc('tempo_task_change', { p_action: 'add', p_id: task.id, p_worker_id: task.workerId, p_title: task.title });
            if (failure) throw new Error(taskError(failure));
          }
          await AsyncStorage.setItem(key, 'true');
        }
        if (scope === generation.current) await checkRevision();
      } catch (failure) { if (scope === generation.current) { setError(failure instanceof Error ? failure.message : 'Could not sync tasks. Check your connection and try again.'); setReady(true); } }
    };
    void start();
    const timer = setInterval(() => { if (isForeground()) void checkRevision(); }, 60000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void checkRevision(); });
    const onVisible = () => { if (isForeground()) void checkRevision(); };
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    let changeTimer: ReturnType<typeof setTimeout> | undefined;
    const channel = client.channel(`tasks:${account}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tempo_sync_revisions' }, payload => {
      if ((payload.new as { section?: string }).section !== 'tasks') return;
      if (changeTimer) clearTimeout(changeTimer);
      changeTimer = setTimeout(() => { void checkRevision(); }, 250);
    }).subscribe();
    return () => { generation.current = scope + 1; clearInterval(timer); if (changeTimer) clearTimeout(changeTimer); subscription.remove(); if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible); void client.removeChannel(channel); };
  }, [enabled, account, admin, localReady, checkRevision]);
  const change = async (action: string, id: string, workerId?: string, title?: string, proofUri?: string) => {
    if (!enabled || !supabase) throw new Error('Could not sync tasks. Check your connection and try again.');
    const { error: failure } = await supabase.rpc('tempo_task_change', { p_action: action, p_id: id, p_worker_id: workerId ?? null, p_title: title ?? null, p_proof_uri: proofUri ?? null });
    if (failure) throw new Error(taskError(failure));
    await checkRevision();
  };
  return { tasks, error, ready, change };
}
