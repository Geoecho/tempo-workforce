export type Role = 'admin' | 'worker';
export type Currency = 'PLN' | 'EUR' | 'USD' | 'GBP';
export type Worker = { id: string; name: string; initials: string; role: string; team: string; color: string; phone?: string; hourlyRate: number };
export type Shift = { id: string; title: string; site: string; location: string; date: string; start: string; end: string; team: string; workerIds: string[]; status: 'upcoming' | 'active' | 'completed' };
export type Punch = { id: string; shiftId: string; workerId: string; type: 'in' | 'out'; at: string; source: 'qr' | 'demo'; rateAtCheckIn?: number };
export type State = { role: Role; selectedWorkerId: string; currency: Currency; workers: Worker[]; shifts: Shift[]; punches: Punch[] };

export const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return localDate(d); };
export const initialState: State = {
  role: 'admin', selectedWorkerId: 'w1', currency: 'PLN',
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
};

export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const today = () => localDate(new Date());
export const formatDay = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
export const formatMoney = (cents: number, currency: Currency) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);

export type PaySummary = { actualMinutes: number; payableMinutes: number; excessMinutes: number; actualSeconds: number; payableSeconds: number; earningsCents: number };
export function paySummary(punches: Punch[], worker: Worker, date: string, now = Date.now()): PaySummary {
  const events = punches.filter(p => p.workerId === worker.id && localDate(new Date(p.at)) === date).sort((a, b) => a.at.localeCompare(b.at));
  const open = new Map<string, Punch>();
  const sessions: { started: number; duration: number; rate: number }[] = [];
  for (const event of events) {
    if (event.type === 'in' && !open.has(event.shiftId)) open.set(event.shiftId, event);
    if (event.type === 'out') {
      const start = open.get(event.shiftId);
      if (start) {
        sessions.push({ started: new Date(start.at).getTime(), duration: Math.max(0, new Date(event.at).getTime() - new Date(start.at).getTime()), rate: start.rateAtCheckIn ?? worker.hourlyRate });
        open.delete(event.shiftId);
      }
    }
  }
  if (date === localDate(new Date(now))) for (const start of open.values()) sessions.push({ started: new Date(start.at).getTime(), duration: Math.max(0, now - new Date(start.at).getTime()), rate: start.rateAtCheckIn ?? worker.hourlyRate });
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
  return { actualMinutes: Math.floor(actualMs / 60_000), payableMinutes: Math.floor(paidMs / 60_000), excessMinutes: Math.floor(Math.max(0, actualMs - paidMs) / 60_000), actualSeconds: Math.floor(actualMs / 1000), payableSeconds: Math.floor(paidMs / 1000), earningsCents };
}
export const qrPayload = (shiftId: string, now = Date.now()) => `tempo:v1:${shiftId}:${Math.floor(now / 30000)}`;
export const parseQr = (value: string) => {
  const [app, version, shiftId, slot] = value.split(':');
  if (app !== 'tempo' || version !== 'v1' || !shiftId || !/^\d+$/.test(slot ?? '')) return null;
  if (Math.abs(Math.floor(Date.now() / 30000) - Number(slot)) > 1) return null;
  return shiftId;
};
