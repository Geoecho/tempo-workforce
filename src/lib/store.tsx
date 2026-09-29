import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useContext, useEffect, useState } from 'react';
import { Currency, initialState, parseQr, paySummary, Punch, qrPayload, Shift, ShiftNotification, State, TimeApproval, teamNames, today, uid, Worker, MAX_PAID_MINUTES_PER_DAY } from './data';
import { Context, Result } from './store-context';
import { supabase } from './supabase';
import { OnlineStoreProvider } from './online-store';

export const KEY = 'tempo-demo-v2';

function LocalStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [notifications, setNotifications] = useState<ShiftNotification[]>([]);
  const [approvals, setApprovals] = useState<TimeApproval[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then(raw => { if (raw) { const saved = { ...initialState, ...JSON.parse(raw) } as State; saved.workers = saved.workers.map(w => ({ ...w, hourlyRate: w.hourlyRate ?? initialState.workers.find(seed => seed.id === w.id)?.hourlyRate ?? 0, phone: w.phone ?? initialState.workers.find(seed => seed.id === w.id)?.phone })); setState(saved); } }).catch(() => {}).finally(() => setReady(true)); }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}); }, [state, ready]);
  const setRole = (role: State['role']) => setState(s => role === 'worker' && !s.workers.some(w => !w.archived) ? s : ({ ...s, role }));
  const setSelectedWorker = (selectedWorkerId: string) => setState(s => s.workers.some(w => w.id === selectedWorkerId && !w.archived) ? ({ ...s, selectedWorkerId }) : s);
  const addTeam = (rawName: string) => setState(s => {
    const name = rawName.trim();
    return !name || teamNames(s).some(team => team.toLowerCase() === name.toLowerCase())
      ? s : { ...s, teams: [...(s.teams ?? []), name] };
  });
  const addWorker = (worker: Omit<Worker, 'id' | 'initials' | 'color'>) => setState(s => {
    const id = uid();
    return { ...s, workers: [...s.workers, { ...worker, id, initials: worker.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase(), color: '#DDEBE5' }], selectedWorkerId: s.selectedWorkerId || id };
  });
  const updateWorker = (id: string, changes: Partial<Pick<Worker, 'name' | 'role' | 'team' | 'phone' | 'hourlyRate'>>) => setState(s => ({ ...s, workers: s.workers.map(w => w.id === id ? { ...w, ...changes, initials: changes.name ? changes.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase() : w.initials } : w) }));
  const removeWorker = (id: string) => setState(s => {
    if (s.shifts.some(shift => [...s.punches].reverse().find(p => p.workerId === id && p.shiftId === shift.id)?.type === 'in')) return s;
    const hasHistory = s.punches.some(p => p.workerId === id);
    const workers = hasHistory ? s.workers.map(w => w.id === id ? { ...w, archived: true } : w) : s.workers.filter(w => w.id !== id);
    return { ...s, workers, role: workers.some(w => !w.archived) ? s.role : 'admin', selectedWorkerId: s.selectedWorkerId === id ? (workers.find(w => !w.archived)?.id ?? '') : s.selectedWorkerId, shifts: s.shifts.map(shift => ({ ...shift, workerIds: shift.workerIds.filter(workerId => workerId !== id) })) };
  });
  const restoreWorker = (id: string) => setState(s => ({ ...s, workers: s.workers.map(w => w.id === id ? { ...w, archived: false } : w) }));
  const setCurrency = (currency: Currency) => setState(s => s.punches.length ? s : ({ ...s, currency }));
  const setWorkspaceName = (rawName: string) => setState(s => rawName.trim() ? { ...s, workspaceName: rawName.trim() } : s);
  const addShift = (shift: Omit<Shift, 'id' | 'status'>) => setState(s => ({ ...s, shifts: [{ ...shift, id: uid(), status: 'upcoming' }, ...s.shifts] }));
  const updateShift = (id: string, changes: Partial<Pick<Shift, 'title' | 'site' | 'location' | 'date' | 'start' | 'end' | 'team' | 'workerIds'>>) => setState(s => ({ ...s, shifts: s.shifts.map(shift => {
    if (shift.id !== id) return shift;
    const locked = s.punches.some(p => p.shiftId === id);
    return { ...shift, ...changes, ...(locked ? { date: shift.date, workerIds: shift.workerIds } : {}) };
  }) }));
  const removeShift = (id: string) => setState(s => {
    if (s.workers.some(w => [...s.punches].reverse().find(p => p.workerId === w.id && p.shiftId === id)?.type === 'in')) return s;
    return { ...s, shifts: s.punches.some(p => p.shiftId === id) ? s.shifts.map(shift => shift.id === id ? { ...shift, archived: true } : shift) : s.shifts.filter(shift => shift.id !== id) };
  });
  const restoreShift = (id: string) => setState(s => ({ ...s, shifts: s.shifts.map(shift => shift.id === id ? { ...shift, archived: false } : shift) }));
  const scan = (payload: string, source: Punch['source'] = 'qr'): Result => {
    const shiftId = parseQr(payload);
    if (!shiftId) return { ok: false, message: 'This QR code is invalid or has expired.' };
    const shift = state.shifts.find(x => x.id === shiftId);
    if (!shift || shift.archived) return { ok: false, message: 'This shift is no longer available.' };
    if (shift.date !== today()) return { ok: false, message: 'This code is for a shift on another day.' };
    if (!shift.workerIds.includes(state.selectedWorkerId)) return { ok: false, message: 'You are not assigned to this shift.' };
    const worker = state.workers.find(w => w.id === state.selectedWorkerId);
    if (!worker || worker.archived) return { ok: false, message: 'Worker profile not available.' };
    const last = [...state.punches].reverse().find(p => p.shiftId === shiftId && p.workerId === state.selectedWorkerId);
    const type = last?.type === 'in' ? 'out' : 'in';
    if (type === 'in') {
      if (worker.hourlyRate <= 0) return { ok: false, message: 'Ask an admin to set your hourly rate before check-in.' };
      if (paySummary(state.punches, worker, today()).payableMinutes >= MAX_PAID_MINUTES_PER_DAY) return { ok: false, message: 'The 10-hour daily payable limit has been reached. Ask a manager to review.' };
      const open = new Set<string>();
      for (const p of state.punches.filter(p => p.workerId === state.selectedWorkerId)) { if (p.type === 'in') open.add(p.shiftId); else open.delete(p.shiftId); }
      if (open.size) return { ok: false, message: 'Check out of your current shift before checking in elsewhere.' };
    }
    const punch: Punch = { id: uid(), shiftId, workerId: state.selectedWorkerId, type, at: new Date().toISOString(), source, workDate: shift.date, ...(type === 'in' ? { rateAtCheckIn: worker.hourlyRate } : {}) };
    const pay = type === 'out' ? paySummary([...state.punches, punch], worker, today()) : undefined;
    setState(s => ({ ...s, punches: [...s.punches, punch] }));
    setApprovals(current => current.filter(a => !(a.workerId === punch.workerId && a.date === punch.workDate)));
    return { ok: true, message: type === 'in' ? `Checked in to ${shift.site}` : `Checked out of ${shift.site}`, type, pay };
  };
  const reset = () => setState(initialState);
  const reviewTime = async (workerId: string, date: string, approve: boolean): Promise<Result> => {
    if (approve && !state.punches.some(p => p.workerId === workerId && (p.workDate ?? p.at.slice(0, 10)) === date)) return { ok: false, message: 'No recorded time for this day.' };
    setApprovals(current => approve ? [...current.filter(a => !(a.workerId === workerId && a.date === date)), { workerId, date, approvedBy: 'Demo manager', approvedAt: new Date().toISOString() }] : current.filter(a => !(a.workerId === workerId && a.date === date)));
    return { ok: true, message: approve ? 'Time approved.' : 'Approval removed.' };
  };
  return <Context.Provider value={{ ...state, ready, online: false, syncError: null, accountEmail: null, notifications, approvals, setRole, setSelectedWorker, addTeam, addWorker, updateWorker, removeWorker, restoreWorker, setCurrency, setWorkspaceName, addShift, updateShift, removeShift, restoreShift, scan, issueQr: async shiftId => qrPayload(shiftId), markNotificationRead: async id => setNotifications(current => current.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item)), reviewTime, reset, inviteWorker: async () => ({ ok: false, message: 'Online database is not configured.' }), signOut: async () => {} }}>{children}</Context.Provider>;
}
export function StoreProvider({ children }: { children: React.ReactNode }) {
  return supabase ? <OnlineStoreProvider>{children}</OnlineStoreProvider> : <LocalStoreProvider>{children}</LocalStoreProvider>;
}
export function useStore() { const value = useContext(Context); if (!value) throw new Error('StoreProvider missing'); return value; }
