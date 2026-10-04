import { editSeries, seriesTargets, validateRoster, SavedSite, ScheduleTemplate, EditScope, ShiftChanges } from './planning';
import { renameTeamInState, removeTeamInState } from './team-rename';
import { archiveShiftGroup, restoreShiftRecord } from './shift-groups';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { clockShiftAvailable, lateMinutes, lateNote, shiftHasEnded, payConfigOf, activeBreak, BreakEvent, Currency, initialState, Message, parseQr, paySummary, punchCooldownSeconds, Punch, qrPayload, Shift, State, TimeApproval, teamNames, uid, Worker, MAX_PAID_MINUTES_PER_DAY } from './data';
import { Context, Result } from './store-context';
import { supabase } from './supabase';
import { OnlineStoreProvider } from './online-store';

import { clockInNotifications, useNotificationInbox } from './notification-inbox';

export const KEY = 'tempo-demo-v2';
const BREAK_KEY = 'tempo-demo-breaks-v1';
const MSG_KEY = 'tempo-demo-messages-v1';

function LocalStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const inbox = useNotificationInbox(`demo:${state.role}:${state.role === 'worker' ? state.selectedWorkerId : 'admin'}`, state.role === 'admin' ? [...clockInNotifications(state), ...(state.demoTaskAlerts ?? [])] : []);
  const [approvals, setApprovals] = useState<TimeApproval[]>([]);
  const [breaks, setBreaks] = useState<BreakEvent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(BREAK_KEY), AsyncStorage.getItem(MSG_KEY)]).then(([raw, rawBreaks, rawMessages]) => { if (raw) { const saved = { ...initialState, ...JSON.parse(raw) } as State; saved.workers = saved.workers.map(w => ({ ...w, hourlyRate: w.hourlyRate ?? initialState.workers.find(seed => seed.id === w.id)?.hourlyRate ?? 0, phone: w.phone ?? initialState.workers.find(seed => seed.id === w.id)?.phone })); setState(saved); } if (rawBreaks) setBreaks(JSON.parse(rawBreaks)); if (rawMessages) setMessages(JSON.parse(rawMessages)); }).catch(() => {}).finally(() => setReady(true)); }, []);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) setState(s => ({ ...s, ...JSON.parse(e.newValue!) }));
      if (e.key === MSG_KEY && e.newValue) setMessages(JSON.parse(e.newValue!));
      if (e.key === BREAK_KEY && e.newValue) setBreaks(JSON.parse(e.newValue!));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}); }, [state, ready]);
  useEffect(() => { if (ready) AsyncStorage.setItem(BREAK_KEY, JSON.stringify(breaks)).catch(() => {}); }, [breaks, ready]);
  useEffect(() => { if (ready) AsyncStorage.setItem(MSG_KEY, JSON.stringify(messages)).catch(() => {}); }, [messages, ready]);
  const setRole = (role: State['role']) => setState(s => role === 'worker' && !s.workers.some(w => !w.archived) ? s : ({ ...s, role }));
  const setSelectedWorker = (selectedWorkerId: string) => setState(s => s.workers.some(w => w.id === selectedWorkerId && !w.archived) ? ({ ...s, selectedWorkerId }) : s);
  const removeTeam = (name: string, destination: string) => setState(s => removeTeamInState(s, name, destination));
  const renameTeam = (oldName: string, newName: string) => setState(s => renameTeamInState(s, oldName, newName));
  const addTeam = (rawName: string) => setState(s => {
    const name = rawName.trim();
    return !name || teamNames(s).some(team => team.toLowerCase() === name.toLowerCase())
      ? s : { ...s, teams: [...(s.teams ?? []), name] };
  });
  const addWorker = (worker: Omit<Worker, 'id' | 'initials' | 'color'>) => setState(s => {
    const id = uid();
    return { ...s, workers: [...s.workers, { ...worker, id, initials: worker.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase(), color: '#DDEBE5' }], selectedWorkerId: s.selectedWorkerId || id };
  });
  const updateWorker = (id: string, changes: Partial<Pick<Worker, 'name' | 'role' | 'team' | 'phone' | 'photoUri' | 'hourlyRate' | 'payConfig' | 'availableDays' | 'unavailableDates'>>) => setState(s => ({ ...s, workers: s.workers.map(w => w.id === id ? { ...w, ...changes, initials: changes.name ? changes.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase() : w.initials } : w) }));
  const removeWorker = (id: string) => setState(s => {
    if (s.shifts.some(shift => [...s.punches].reverse().find(p => p.workerId === id && p.shiftId === shift.id)?.type === 'in')) return s;
    const hasHistory = s.punches.some(p => p.workerId === id);
    const workers = hasHistory ? s.workers.map(w => w.id === id ? { ...w, archived: true } : w) : s.workers.filter(w => w.id !== id);
    return { ...s, workers, role: workers.some(w => !w.archived) ? s.role : 'admin', selectedWorkerId: s.selectedWorkerId === id ? (workers.find(w => !w.archived)?.id ?? '') : s.selectedWorkerId, shifts: s.shifts.map(shift => ({ ...shift, workerIds: shift.workerIds.filter(workerId => workerId !== id) })) };
  });
  const restoreWorker = (id: string) => setState(s => ({ ...s, workers: s.workers.map(w => w.id === id ? { ...w, archived: false } : w) }));
  const setCurrency = (currency: Currency) => setState(s => s.punches.length ? s : ({ ...s, currency }));
  const setWorkspaceName = (rawName: string) => setState(s => rawName.trim() ? { ...s, workspaceName: rawName.trim() } : s);
  const saveSite = (site: SavedSite) => { setState(s => ({ ...s, sites: [...(s.sites ?? []).filter(item => item.id !== site.id && item.name.toLowerCase() !== site.name.toLowerCase()), site] })); return { ok: true, message: 'Saved.' }; };
  const saveTemplate = (template: ScheduleTemplate) => { setState(s => ({ ...s, templates: [...(s.templates ?? []).filter(item => item.id !== template.id && item.name.toLowerCase() !== template.name.toLowerCase()), template] })); return { ok: true, message: 'Saved.' }; };
  const editShiftSeries = (id: string, changes: ShiftChanges, scope: EditScope) => {
    const current = state;
    const next = editSeries(current, id, changes, scope);
    const source = current.shifts.find(shift => shift.id === id);
    const ids = new Set(source ? seriesTargets(current, source, scope).map(shift => shift.id) : []);
    const error = validateRoster(next.shifts.filter(shift => ids.has(shift.id)), current.workers, current.shifts);
    if (error) return { ok: false, message: error };
    setState(next); return { ok: true, message: 'Changes saved.' };
  };
  const addShift = (shift: Omit<Shift, 'id' | 'status'>) => setState(s => ({ ...s, shifts: [{ ...shift, id: uid(), status: 'upcoming' }, ...s.shifts] }));
  const addShifts = (drafts: Omit<Shift, 'id' | 'status'>[]) => {
    const current = state;
    const added = drafts.map(shift => ({ ...shift, id: uid(), status: 'upcoming' as const }));
    const error = validateRoster(added, current.workers, current.shifts);
    if (error) return { ok: false, message: error };
    setState(s => ({ ...s, shifts: [...added, ...s.shifts] })); return { ok: true, message: 'Shifts saved.' };
  };
  const updateShift = (id: string, changes: Partial<Pick<Shift, 'title' | 'site' | 'location' | 'latitude' | 'longitude' | 'date' | 'start' | 'end' | 'team' | 'workerIds'>>) => setState(s => ({ ...s, shifts: s.shifts.map(shift => {
    if (shift.id !== id) return shift;
    const locked = s.punches.some(p => p.shiftId === id);
    return { ...shift, ...changes, ...(locked ? { date: shift.date, workerIds: shift.workerIds } : {}) };
  }) }));
  const removeShift = (id: string) => setState(s => archiveShiftGroup(s, [id]));
  const removeShifts = (ids: string[]) => setState(s => archiveShiftGroup(s, ids));
  const restoreShift = (id: string) => setState(s => restoreShiftRecord(s, id));
  const scan = (payload: string, source: Punch['source'] = 'qr'): Result => {
    const shiftId = parseQr(payload);
    if (!shiftId) return { ok: false, message: 'This QR code is invalid or has expired.' };
    const shift = state.shifts.find(x => x.id === shiftId);
    if (!shift || shift.archived) return { ok: false, message: 'This shift is no longer available.' };
    if (!clockShiftAvailable(shift, state.punches, Date.now(), state.selectedWorkerId)) return { ok: false, message: 'This code is for a shift on another day.' };
    if (!shift.workerIds.includes(state.selectedWorkerId)) return { ok: false, message: 'You are not assigned to this shift.' };
    const worker = state.workers.find(w => w.id === state.selectedWorkerId);
    if (!worker || worker.archived) return { ok: false, message: 'Worker profile not available.' };
    const wait = punchCooldownSeconds(state.punches, state.selectedWorkerId);
    if (wait) return { ok: false, message: `Please wait ${wait} seconds before scanning again. Your last clock action was saved.` };
    const last = [...state.punches].reverse().find(p => p.shiftId === shiftId && p.workerId === state.selectedWorkerId);
    const type = last?.type === 'in' ? 'out' : 'in';
    if (type === 'in') {
      if (shiftHasEnded(shift)) return { ok: false, message: 'This shift has ended, so check-in is closed. Ask a manager if you worked it.' };
      if (worker.hourlyRate <= 0 && payConfigOf(worker.id).type === 'hourly') return { ok: false, message: 'Ask an admin to set your hourly rate before check-in.' };
      if (paySummary(state.punches, worker, shift.date).payableMinutes >= MAX_PAID_MINUTES_PER_DAY) return { ok: false, message: 'The 10-hour daily payable limit has been reached. Ask a manager to review.' };
      const open = new Set<string>();
      for (const p of state.punches.filter(p => p.workerId === state.selectedWorkerId)) { if (p.type === 'in') open.add(p.shiftId); else open.delete(p.shiftId); }
      if (open.size) return { ok: false, message: 'Check out of your current shift before checking in elsewhere.' };
    }
    const punch: Punch = { id: uid(), shiftId, workerId: state.selectedWorkerId, type, at: new Date().toISOString(), source, workDate: shift.date, ...(type === 'in' ? { rateAtCheckIn: worker.hourlyRate } : {}) };
    const pay = type === 'out' ? paySummary([...state.punches, punch], worker, shift.date) : undefined;
    setState(s => ({ ...s, punches: [...s.punches, punch] }));
    setApprovals(current => current.filter(a => !(a.workerId === punch.workerId && a.date === punch.workDate)));
    return { ok: true, message: (type === 'in' ? `Checked in to ${shift.site}.` : `Checked out of ${shift.site}`) + (type === 'in' ? lateNote(lateMinutes(shift, [punch], worker.id)) : ''), type, pay };
  };
  const toggleBreak = async (shiftId: string): Promise<Result> => {
    const shift = state.shifts.find(item => item.id === shiftId && clockShiftAvailable(item, state.punches, Date.now(), state.selectedWorkerId) && item.workerIds.includes(state.selectedWorkerId));
    if (state.role !== 'worker' || !shift) return { ok: false, message: 'This shift is not available to you.' };
    const punch = [...state.punches].reverse().find(item => item.shiftId === shiftId && item.workerId === state.selectedWorkerId);
    if (punch?.type !== 'in') return { ok: false, message: 'Check in before starting a break.' };
    const latest = breaks.filter(item => item.shiftId === shiftId && item.workerId === state.selectedWorkerId && item.at > punch.at).at(-1);
    if (latest && Date.now() - new Date(latest.at).getTime() < 15_000) return { ok: false, message: 'Please wait a moment before changing your break status.' };
    const type = activeBreak(breaks, state.punches, shiftId, state.selectedWorkerId) ? 'end' : 'start';
    setBreaks(current => [...current, { id: uid(), shiftId, workerId: state.selectedWorkerId, type, at: new Date().toISOString(), workDate: shift.date }]);
    return { ok: true, message: type === 'start' ? 'Paid break started.' : 'Paid break ended.' };
  };
  const reset = () => { setState(initialState); setBreaks([]); setMessages([]); };
  const sendMessage = async (to: string | 'all', body: string): Promise<Result> => {
    if (!body.trim()) return { ok: false, message: 'Message cannot be empty.' };
    const from = state.role === 'admin' ? 'admin' : state.selectedWorkerId;
    const msg: Message = { id: uid(), from, to, body: body.trim(), createdAt: new Date().toISOString(), readAt: null };
    setState(s => ({ ...s, messages: [msg, ...(s.messages || [])] }));
    setMessages(current => [msg, ...current]);
    return { ok: true, message: 'Message sent.' };
  };
  const markMessageRead = async (id: string) => {
    setState(s => ({ ...s, messages: (s.messages || []).map(m => m.id === id ? { ...m, readAt: m.readAt ?? new Date().toISOString() } : m) }));
    setMessages(current => current.map(m => m.id === id ? { ...m, readAt: m.readAt ?? new Date().toISOString() } : m));
  };
  const applyLocalCorrection = (workerId: string, shiftId: string, start: string, end: string): Result => {
    if (state.role !== 'admin') return { ok: false, message: 'Admin access required.' };
    const shift = state.shifts.find(item => item.id === shiftId); const worker = state.workers.find(item => item.id === workerId);
    if (!shift || !worker || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start === end) return { ok: false, message: 'Choose your shift and different clock times.' };
    const pin = new Date(`${shift.date}T${start}:00`); const pout = new Date(`${shift.date}T${end}:00`); if (end < start) pout.setDate(pout.getDate() + 1);
    if (pout.getTime() > Date.now()) return { ok: false, message: 'Corrected attendance cannot be in the future.' };
    const prior = state.punches.find(p => p.workerId === workerId && p.shiftId === shiftId && p.type === 'in');
    const pair: Punch[] = [{ id: uid(), workerId, shiftId, type: 'in', at: pin.toISOString(), source: 'correction', workDate: shift.date, rateAtCheckIn: prior?.rateAtCheckIn ?? worker.hourlyRate }, { id: uid(), workerId, shiftId, type: 'out', at: pout.toISOString(), source: 'correction', workDate: shift.date }];
    setState(current => ({ ...current, punches: [...current.punches.filter(p => !(p.workerId === workerId && p.shiftId === shiftId)), ...pair] }));
    setApprovals(current => current.filter(item => !(item.workerId === workerId && item.date === shift.date)));
    return { ok: true, message: 'Attendance corrected.' };
  };
  const reviewTime = async (workerId: string, date: string, approve: boolean): Promise<Result> => {
    if (approve && !state.punches.some(p => p.workerId === workerId && (p.workDate ?? p.at.slice(0, 10)) === date)) return { ok: false, message: 'No recorded time for this day.' };
    setApprovals(current => approve ? [...current.filter(a => !(a.workerId === workerId && a.date === date)), { workerId, date, approvedBy: 'Demo manager', approvedAt: new Date().toISOString() }] : current.filter(a => !(a.workerId === workerId && a.date === date)));
    return { ok: true, message: approve ? 'Time approved.' : 'Approval removed.' };
  };
  const recordLocalTaskCompletion = (id: string, workerId: string, title: string) => setState(current => {
    if (current.demoTaskAlerts?.some(alert => alert.id === `task:${id}`)) return current;
    return { ...current, demoTaskAlerts: [...(current.demoTaskAlerts ?? []), { id: `task:${id}`, workerId, shiftId: `task:${id}`, kind: 'task-completed', title: 'Task completed', body: `${current.workers.find(worker => worker.id === workerId)?.name ?? 'Worker'} · ${title}`, createdAt: new Date().toISOString(), readAt: null }] };
  });
  return <Context.Provider value={{ ...state, recordLocalTaskCompletion, applyLocalCorrection, ready, online: false, syncStatus: 'saved', retrySync: async () => {}, refreshSharedData: async () => {}, syncError: null, accountEmail: null, notifications: inbox.notifications, dismissNotification: inbox.dismissNotification, approvals, breaks, messages, setRole, setSelectedWorker, addTeam, renameTeam, removeTeam, addWorker, updateWorker, removeWorker, restoreWorker, setCurrency, setWorkspaceName, saveSite, saveTemplate, editShiftSeries, addShift, addShifts, updateShift, removeShift, removeShifts, restoreShift, scan, toggleBreak, issueQr: async shiftId => qrPayload(shiftId), markNotificationRead: inbox.markLocalNotificationRead, markNotificationsRead: inbox.markLocalNotificationsRead, reviewTime, sendMessage, markMessageRead, reset, inviteWorker: async () => ({ ok: false, message: 'Online database is not configured.' }), signOut: async () => {} }}>{children}</Context.Provider>;
}
export function StoreProvider({ children, authBoundary = false }: { children: React.ReactNode; authBoundary?: boolean }) {
  const pathname = usePathname();
  // Public screens keep the navigator mounted; Start owns its auth boundary.
  if (!authBoundary && (pathname === '/welcome' || pathname === '/start')) return <LocalStoreProvider>{children}</LocalStoreProvider>;
  return supabase ? <OnlineStoreProvider>{children}</OnlineStoreProvider> : <LocalStoreProvider>{children}</LocalStoreProvider>;
}
export function useStore() { const value = useContext(Context); if (!value) throw new Error('StoreProvider missing'); return value; }
