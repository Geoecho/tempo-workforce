import type { SavedSite, ScheduleTemplate } from './planning';
import { getCurrentLanguage } from './locale.ts';

export type Role = 'admin' | 'worker';
export const CURRENCIES = ['MKD', 'EUR', 'USD', 'PLN', 'GBP', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'DKK', 'CZK', 'HUF', 'RON', 'UAH', 'AED', 'INR', 'SGD', 'JPY', 'BRL', 'MXN', 'ZAR'] as const;
export type Currency = typeof CURRENCIES[number];
export type Worker = { id: string; name: string; initials: string; role: string; team: string; color: string; phone?: string; photoUri?: string; hourlyRate: number; payConfig?: PayConfig; availableDays?: number[]; unavailableDates?: string[]; archived?: boolean };
export type Shift = { id: string; title: string; site: string; location: string; latitude?: number; longitude?: number; seriesId?: string; slotId?: string; requiredWorkers?: number; date: string; start: string; end: string; team: string; workerIds: string[]; status: 'upcoming' | 'active' | 'completed'; archived?: boolean };
export type Punch = { id: string; shiftId: string; workerId: string; type: 'in' | 'out'; at: string; source: 'qr' | 'demo' | 'correction'; rateAtCheckIn?: number; workDate?: string };
export type BreakEvent = { id: string; shiftId: string; workerId: string; type: 'start' | 'end'; at: string; workDate: string };
export type ShiftNotification = { id: string; workerId: string; shiftId: string; kind: 'assigned' | 'changed' | 'removed' | 'clocked-in' | 'task-completed'; title: string; body: string; createdAt: string; readAt: string | null };
export type TimeApproval = { workerId: string; date: string; approvedBy: string; approvedAt: string };
export type Message = { id: string; from: 'admin' | string; to: string | 'all'; body: string; createdAt: string; readAt: string | null };
export type State = { role: Role; selectedWorkerId: string; currency: Currency; workspaceName?: string; demoTaskAlerts?: ShiftNotification[]; sites?: SavedSite[]; templates?: ScheduleTemplate[]; teams?: string[]; workers: Worker[]; shifts: Shift[]; punches: Punch[]; messages?: Message[] };
export const teamNames = (state: Pick<State, 'teams' | 'workers'>): string[] =>
  [...new Set([...(state.teams ?? []), ...state.workers.map(worker => worker.team)].filter(Boolean))];

export const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return localDate(d); };
export const initialState: State = {
  role: 'admin', selectedWorkerId: 'w1', currency: 'PLN', teams: ['Production', 'Operations'],
  workers: [
    { id: 'w1', name: 'Alex Morgan', initials: 'AM', role: 'Stage crew', team: 'Production', color: '#CDE8DF', phone: '+12025550101', hourlyRate: 38 },
    { id: 'w2', name: 'Jordan Lee', initials: 'JL', role: 'Lighting tech', team: 'Production', color: '#E8DFF5', phone: '+12025550102', hourlyRate: 45 },
    { id: 'w3', name: 'Sam Rivera', initials: 'SR', role: 'Floor lead', team: 'Operations', color: '#F9E5CA', phone: '+12025550103', hourlyRate: 42 },
    { id: 'w4', name: 'Taylor Brooks', initials: 'TB', role: 'Security', team: 'Operations', color: '#DCE7F6', phone: '+12025550104', hourlyRate: 35 },
    { id: 'w5', name: 'Casey Chen', initials: 'CC', role: 'Runner', team: 'Production', color: '#F5DDE1', phone: '+12025550105', hourlyRate: 32 },
  ],
  shifts: [
    { id: 's1', title: 'Main stage setup', site: 'Northline Festival', location: 'East Field · Gate 2', date: day(0), start: '09:00', end: '17:00', team: 'Production', workerIds: ['w1', 'w2', 'w5'], status: 'active' },
    { id: 's2', title: 'Evening doors', site: 'Northline Festival', location: 'Main Entrance', date: day(0), start: '18:00', end: '23:30', team: 'Operations', workerIds: ['w3', 'w4'], status: 'upcoming' },
    { id: 's3', title: 'Soundcheck & rigging', site: 'The Foundry', location: 'Hall A', date: day(1), start: '08:00', end: '16:00', team: 'Production', workerIds: ['w1', 'w2', 'w5'], status: 'upcoming' },
    { id: 's4', title: 'Warehouse inventory', site: 'Central Warehouse', location: 'Dock 4', date: day(2), start: '07:00', end: '15:00', team: 'Operations', workerIds: ['w3', 'w4'], status: 'upcoming' },
  ],
  punches: [],
  messages: [],
};
export const newWorkspaceState = (name: string): State => ({ role: 'admin', selectedWorkerId: '', currency: 'EUR', workspaceName: name.trim(), teams: [], workers: [], shifts: [], punches: [] });

export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const today = () => localDate(new Date());
export const formatDay = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(getCurrentLanguage(), { weekday: 'short', month: 'short', day: 'numeric' });
export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(getCurrentLanguage(), { hour: 'numeric', minute: '2-digit' });
export const shiftHasEnded = (shift: Shift, now = Date.now()) => {
  const end = new Date(`${shift.date}T${shift.end}:00`);
  if (shift.end <= shift.start) end.setDate(end.getDate() + 1);
  return end.getTime() < now;
};
export const clockShiftAvailable = (shift: Shift, punches: Punch[], now = Date.now(), workerId?: string) => {
  if (shift.archived) return false;
  if (shift.date === localDate(new Date(now))) return true;
  const previous = new Date(now); previous.setDate(previous.getDate() - 1);
  return shift.end < shift.start && shift.date === localDate(previous) && !shiftHasEnded(shift, now)
    || shiftHasOpenPunch(shift.id, workerId ? punches.filter(punch => punch.workerId === workerId) : punches);
};
// Arriving more than the grace period after the shift start counts as late. Derived from the first check-in, so it is always on record.
export const LATE_GRACE_MINUTES = 5;
export const lateMinutes = (shift: Shift, punches: Punch[], workerId: string) => {
  const first = punches.filter(p => p.shiftId === shift.id && p.workerId === workerId && p.type === 'in').sort((a, b) => a.at.localeCompare(b.at))[0];
  if (!first) return 0;
  const minutes = Math.floor((new Date(first.at).getTime() - new Date(`${shift.date}T${shift.start}:00`).getTime()) / 60000);
  return minutes > LATE_GRACE_MINUTES ? minutes : 0;
};
export const lateNote = (minutes: number) => minutes ? ` You arrived ${minutes} min late. This has been logged.` : '';
export const shiftHasOpenPunch = (shiftId: string, punches: Punch[]) => {
  const latest = new Map<string, Punch>();
  for (const punch of punches.filter(item => item.shiftId === shiftId).sort((a, b) => a.at.localeCompare(b.at))) latest.set(punch.workerId, punch);
  return [...latest.values()].some(punch => punch.type === 'in');
};
export const activeBreak = (breaks: BreakEvent[], punches: Punch[], shiftId: string, workerId: string) => {
  const punch = punches.filter(item => item.shiftId === shiftId && item.workerId === workerId).sort((a, b) => b.at.localeCompare(a.at))[0];
  if (!punch || punch.type !== 'in') return null;
  const event = breaks.filter(item => item.shiftId === shiftId && item.workerId === workerId && item.at > punch.at).sort((a, b) => b.at.localeCompare(a.at))[0];
  return event?.type === 'start' ? event : null;
};
export type ShiftRepeat = 'once' | 'daily' | 'weekdays';
export const repeatShiftDates = (start: string, until: string, repeat: ShiftRepeat): string[] => {
  if (repeat === 'once') return [start];
  const cursor = new Date(`${start}T12:00:00`);
  const end = new Date(`${until}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || end < cursor) return [];
  const dates: string[] = [];
  for (let day = 0; cursor <= end && day < 31; day++, cursor.setDate(cursor.getDate() + 1)) {
    if (repeat === 'daily' || (cursor.getDay() !== 0 && cursor.getDay() !== 6)) dates.push(localDate(cursor));
  }
  return dates;
};
export const durationMinutes = (punches: Punch[], shiftId?: string, workerId?: string) => {
  const sorted = punches.filter(p => (!shiftId || p.shiftId === shiftId) && (!workerId || p.workerId === workerId)).sort((a, b) => a.at.localeCompare(b.at));
  const active = new Map<string, number>(); let total = 0;
  for (const punch of sorted) {
    const key = `${punch.workerId}:${punch.shiftId}`;
    if (punch.type === 'in' && !active.has(key)) active.set(key, new Date(punch.at).getTime());
    if (punch.type === 'out' && active.has(key)) { total += Math.max(0, new Date(punch.at).getTime() - active.get(key)!); active.delete(key); }
  }
  for (const start of active.values()) total += Math.max(0, Date.now() - start);
  return Math.floor(total / 60000);
};
export const hoursLabel = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
export const payTimeLabel = (seconds: number) => seconds > 0 && seconds < 60 ? `${seconds}s` : hoursLabel(Math.floor(seconds / 60));
export const MAX_PAID_MINUTES_PER_DAY = 600;
export const PUNCH_COOLDOWN_SECONDS = 45;
export const punchCooldownSeconds = (punches: Punch[], workerId: string, now = Date.now()) => {
  const latest = punches.filter(punch => punch.workerId === workerId).reduce<Punch | null>((current, punch) => !current || punch.at > current.at ? punch : current, null);
  return latest ? Math.max(0, Math.ceil((PUNCH_COOLDOWN_SECONDS * 1000 - (now - new Date(latest.at).getTime())) / 1000)) : 0;
};
export const formatMoney = (cents: number, currency: Currency) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);


// Pay models. Hourly is the default; "event" pays a flat amount per shift attended; "fixed" is a monthly salary (accrues as a daily share on days worked).
export type PayType = 'hourly' | 'event' | 'fixed';
export type PayConfig = { type: PayType; amount: number; monthlyHours?: number };
let payWorkers: Record<string, PayConfig> = {};
let payShifts: Record<string, number> = {};
export const setPayRegistry = (workersCfg: Record<string, PayConfig>, shiftCfg: Record<string, number>) => { payWorkers = workersCfg; payShifts = shiftCfg; };
export const payConfigOf = (workerId: string): PayConfig => payWorkers[workerId] ?? { type: 'hourly', amount: 0 };
export const shiftPayOf = (shiftId: string): number | undefined => payShifts[shiftId];
export const payUnitLabel = (type: PayType) => type === 'event' ? 'event' : type === 'fixed' ? 'month' : 'hour';

export type PaySummary = { actualMinutes: number; payableMinutes: number; excessMinutes: number; actualSeconds: number; payableSeconds: number; earningsCents: number };
export function paySummary(punches: Punch[], worker: Worker, date: string, now = Date.now()): PaySummary {
  const events = punches.filter(p => p.workerId === worker.id && (p.workDate ?? localDate(new Date(p.at))) === date).sort((a, b) => a.at.localeCompare(b.at));
  const open = new Map<string, Punch>();
  const sessions: { started: number; duration: number; rate: number; shiftId: string }[] = [];
  for (const event of events) {
    if (event.type === 'in' && !open.has(event.shiftId)) open.set(event.shiftId, event);
    if (event.type === 'out') {
      const start = open.get(event.shiftId);
      if (start) {
        sessions.push({ started: new Date(start.at).getTime(), duration: Math.max(0, new Date(event.at).getTime() - new Date(start.at).getTime()), rate: start.rateAtCheckIn ?? worker.hourlyRate, shiftId: event.shiftId });
        open.delete(event.shiftId);
      }
    }
  }
  if (date === localDate(new Date(now))) for (const start of open.values()) sessions.push({ started: new Date(start.at).getTime(), duration: Math.max(0, now - new Date(start.at).getTime()), rate: start.rateAtCheckIn ?? worker.hourlyRate, shiftId: start.shiftId });
  sessions.sort((a, b) => a.started - b.started);
  const capMs = MAX_PAID_MINUTES_PER_DAY * 60_000;
  let actualMs = 0;
  let paidMs = 0;
  let earningsCents = 0;
  for (const session of sessions) {
    const remaining = Math.max(0, capMs - paidMs);
    const payable = Math.min(session.duration, remaining);
    actualMs += session.duration;
    paidMs += payable;
    earningsCents += Math.round(payable / 3_600_000 * session.rate * 100);
  }
  const cfg = payConfigOf(worker.id);
  if (cfg.type === 'event') {
    const shiftIds = [...new Set(sessions.map(x => x.shiftId))];
    earningsCents = shiftIds.reduce((sum, id) => sum + Math.round((shiftPayOf(id) ?? cfg.amount) * 100), 0);
  }
  return { actualMinutes: Math.floor(actualMs / 60_000), payableMinutes: Math.floor(paidMs / 60_000), excessMinutes: Math.floor(Math.max(0, actualMs - paidMs) / 60_000), actualSeconds: Math.floor(actualMs / 1000), payableSeconds: Math.floor(paidMs / 1000), earningsCents };
}
export const qrPayload = (shiftId: string, now = Date.now()) => `tempo:v1:${shiftId}:${Math.floor(now / 30000)}`;
export const parseQr = (value: string) => {
  const [app, version, shiftId, slot] = value.split(':');
  if (app !== 'tempo' || version !== 'v1' || !shiftId || !/^\d+$/.test(slot ?? '')) return null;
  if (Math.abs(Math.floor(Date.now() / 30000) - Number(slot)) > 1) return null;
  return shiftId;
};
