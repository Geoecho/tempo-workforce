import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useStore } from './store';
import { supabase } from './supabase';
import { localDate, uid } from './data';

export type WorkRequest = { id: string; workerId: string; kind: 'leave' | 'correction'; fromDate: string; toDate: string; shiftId?: string; inTime?: string; outTime?: string; reason: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string; reviewedAt?: string; reviewNote?: string };
type Draft = Omit<WorkRequest, 'id' | 'workerId' | 'status' | 'createdAt'>;
type Requests = { items: WorkRequest[]; error: string; submit: (draft: Draft) => Promise<void>; review: (id: string, approve: boolean, note: string) => Promise<void> };
const Context = createContext<Requests | null>(null);
const safeError = (error: { code?: string; message?: string }) => error.code === 'P0001' || error.code?.startsWith('PT') ? error.message ?? 'Could not save the request.' : 'Requests could not sync. Check your connection or ask an admin to apply the workflow database update.';
export function WorkRequestsProvider({ children }: { children: React.ReactNode }) {
  const { ready, online, accountEmail, selectedWorkerId, role, workers, updateWorker, applyLocalCorrection, refreshSharedData } = useStore();
  const [items, setItems] = useState<WorkRequest[]>([]);
  const [error, setError] = useState('');
  const [source, setSource] = useState('demo');
  const [localReady, setLocalReady] = useState(false);
  const refresh = useCallback(async () => {
    if (!ready || !online || !supabase) return;
    const { data, error: failure } = await supabase.rpc('tempo_request_list');
    if (failure) { setError(safeError(failure)); return; }
    setSource(accountEmail ?? '');
    setItems(current => JSON.stringify(current) === JSON.stringify(data) ? current : data ?? []); setError('');
  }, [ready, online, accountEmail]);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    if (!online) { void AsyncStorage.getItem('tempo-demo-requests-v1').then(raw => { if (active) { setItems(raw ? JSON.parse(raw) : []); setLocalReady(true); } }).catch(() => { if (active) setLocalReady(true); }); return () => { active = false; }; }
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 20000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { clearTimeout(first); clearInterval(timer); listener.remove(); };
  }, [ready, online, accountEmail, refresh]);
  useEffect(() => { if (!online && localReady) void AsyncStorage.setItem('tempo-demo-requests-v1', JSON.stringify(items)); }, [items, online, localReady]);
  const submit = async (draft: Draft) => {
    if (role !== 'worker') throw new Error('Worker access required.');
    const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
    if (!validDate(draft.fromDate) || !validDate(draft.toDate) || !draft.reason.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(draft.fromDate) || draft.toDate < draft.fromDate || (Date.parse(draft.toDate) - Date.parse(draft.fromDate)) / 86400000 > 90) throw new Error('Enter valid dates and a reason.');
    if (items.some(item => item.workerId === selectedWorkerId && item.kind === draft.kind && item.fromDate === draft.fromDate && item.shiftId === draft.shiftId && item.status === 'pending')) throw new Error('A request for this day is already awaiting review.');
    const id = uid();
    if (online && supabase) {
      const { error: failure } = await supabase.rpc('tempo_request_submit', { p_id: id, p_kind: draft.kind, p_from: draft.fromDate, p_until: draft.toDate, p_reason: draft.reason.trim(), p_shift_id: draft.shiftId ?? null, p_in: draft.inTime ?? null, p_out: draft.outTime ?? null });
      if (failure) throw new Error(safeError(failure)); await refresh(); return;
    }
    setItems(current => [{ ...draft, id, workerId: selectedWorkerId, status: 'pending', reason: draft.reason.trim(), createdAt: new Date().toISOString() }, ...current]);
  };
  const review = async (id: string, approve: boolean, note: string) => {
    if (role !== 'admin') throw new Error('Admin access required.');
    if (!note.trim()) throw new Error('Add a review note.');
    if (online && supabase) {
      const { error: failure } = await supabase.rpc('tempo_request_review', { p_id: id, p_approve: approve, p_note: note.trim() });
      if (failure) throw new Error(safeError(failure)); await Promise.all([refresh(), refreshSharedData()]); return;
    }
    const request = items.find(item => item.id === id && item.status === 'pending');
    if (!request) throw new Error('This request is no longer awaiting review.');
    if (approve && request.kind === 'leave') {
      const days: string[] = []; const date = new Date(`${request.fromDate}T12:00:00`);
      while (localDate(date) <= request.toDate && days.length <= 91) { days.push(localDate(date)); date.setDate(date.getDate() + 1); }
      const worker = workers.find(item => item.id === request.workerId);
      if (!worker) throw new Error('This worker is no longer available.');
      updateWorker(worker.id, { unavailableDates: [...new Set([...(worker.unavailableDates ?? []), ...days])] });
    }
    if (approve && request.kind === 'correction') {
      const result = applyLocalCorrection(request.workerId, request.shiftId ?? '', request.inTime ?? '', request.outTime ?? '');
      if (!result.ok) throw new Error(result.message);
    }
    setItems(current => current.map(item => item.id === id ? { ...item, status: approve ? 'approved' : 'rejected', reviewedAt: new Date().toISOString(), reviewNote: note.trim() } : item));
  };
  return <Context.Provider value={{ items: online && source !== (accountEmail ?? '') ? [] : role === 'worker' ? items.filter(item => item.workerId === selectedWorkerId) : items, error, submit, review }}>{children}</Context.Provider>;
}
export const useWorkRequests = () => { const value = useContext(Context); if (!value) throw new Error('Requests provider missing'); return value; };
