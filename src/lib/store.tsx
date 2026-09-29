import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Currency, initialState, parseQr, paySummary, Punch, Shift, State, today, uid, Worker, MAX_PAID_MINUTES_PER_DAY, PaySummary } from './data';

type Result = { ok: boolean; message: string; type?: 'in' | 'out'; pay?: PaySummary };
type Store = State & {
  ready: boolean;
  setRole: (role: State['role']) => void;
  setSelectedWorker: (id: string) => void;
  addWorker: (worker: Omit<Worker, 'id' | 'initials' | 'color'>) => void;
  updateWorker: (id: string, changes: Partial<Pick<Worker, 'name' | 'role' | 'team' | 'phone' | 'hourlyRate'>>) => void;
  setCurrency: (currency: Currency) => void;
  addShift: (shift: Omit<Shift, 'id' | 'status'>) => void;
  scan: (payload: string, source?: Punch['source']) => Result;
  reset: () => void;
};
const Context = createContext<Store | null>(null);
const KEY = 'tempo-demo-v2';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then(raw => { if (raw) { const saved = { ...initialState, ...JSON.parse(raw) } as State; saved.workers = saved.workers.map(w => ({ ...w, hourlyRate: w.hourlyRate ?? initialState.workers.find(seed => seed.id === w.id)?.hourlyRate ?? 0, phone: w.phone ?? initialState.workers.find(seed => seed.id === w.id)?.phone })); const staleSeed = saved.shifts.length === 4 && saved.workers.length === 5 && saved.punches.length === 0 && saved.shifts.find(s => s.id === 's1')?.date !== today(); setState(staleSeed ? initialState : saved); } }).catch(() => {}).finally(() => setReady(true)); }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}); }, [state, ready]);
  const setRole = (role: State['role']) => setState(s => ({ ...s, role }));
  const setSelectedWorker = (selectedWorkerId: string) => setState(s => ({ ...s, selectedWorkerId }));
  const addWorker = (worker: Omit<Worker, 'id' | 'initials' | 'color'>) => setState(s => ({ ...s, workers: [...s.workers, { ...worker, id: uid(), initials: worker.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase(), color: '#DDEBE5' }] }));
  const updateWorker = (id: string, changes: Partial<Pick<Worker, 'name' | 'role' | 'team' | 'phone' | 'hourlyRate'>>) => setState(s => ({ ...s, workers: s.workers.map(w => w.id === id ? { ...w, ...changes, initials: changes.name ? changes.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase() : w.initials } : w) }));
  const setCurrency = (currency: Currency) => setState(s => s.punches.length ? s : ({ ...s, currency }));
  const addShift = (shift: Omit<Shift, 'id' | 'status'>) => setState(s => ({ ...s, shifts: [{ ...shift, id: uid(), status: 'upcoming' }, ...s.shifts] }));
  const scan = (payload: string, source: Punch['source'] = 'qr'): Result => {
    const shiftId = parseQr(payload);
    if (!shiftId) return { ok: false, message: 'This QR code is invalid or has expired.' };
    const shift = state.shifts.find(x => x.id === shiftId);
    if (!shift) return { ok: false, message: 'This shift was not found.' };
    if (shift.date !== today()) return { ok: false, message: 'This code is for a shift on another day.' };
    if (!shift.workerIds.includes(state.selectedWorkerId)) return { ok: false, message: 'You are not assigned to this shift.' };
    const worker = state.workers.find(w => w.id === state.selectedWorkerId);
    if (!worker) return { ok: false, message: 'Worker profile not found.' };
    const last = [...state.punches].reverse().find(p => p.shiftId === shiftId && p.workerId === state.selectedWorkerId);
    const type = last?.type === 'in' ? 'out' : 'in';
    if (type === 'in') {
      if (worker.hourlyRate <= 0) return { ok: false, message: 'Ask an admin to set your hourly rate before check-in.' };
      if (paySummary(state.punches, worker, today()).payableMinutes >= MAX_PAID_MINUTES_PER_DAY) return { ok: false, message: 'The 10-hour daily payable limit has been reached. Ask a manager to review.' };
      const open = new Set<string>();
      for (const p of state.punches.filter(p => p.workerId === state.selectedWorkerId)) { if (p.type === 'in') open.add(p.shiftId); else open.delete(p.shiftId); }
      if (open.size) return { ok: false, message: 'Check out of your current shift before checking in elsewhere.' };
    }
    const punch: Punch = { id: uid(), shiftId, workerId: state.selectedWorkerId, type, at: new Date().toISOString(), source, ...(type === 'in' ? { rateAtCheckIn: worker.hourlyRate } : {}) };
    const pay = type === 'out' ? paySummary([...state.punches, punch], worker, today()) : undefined;
    setState(s => ({ ...s, punches: [...s.punches, punch] }));
    return { ok: true, message: type === 'in' ? `Checked in to ${shift.site}` : `Checked out of ${shift.site}`, type, pay };
  };
  const reset = () => setState(initialState);
  return <Context.Provider value={{ ...state, ready, setRole, setSelectedWorker, addWorker, updateWorker, setCurrency, addShift, scan, reset }}>{children}</Context.Provider>;
}
export function useStore() { const value = useContext(Context); if (!value) throw new Error('StoreProvider missing'); return value; }
