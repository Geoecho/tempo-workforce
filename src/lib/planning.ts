import type { Shift, State } from './data';

export type SavedSite = { id: string; name: string; location: string; latitude?: number; longitude?: number };
export type SlotTemplate = { start: string; end: string; workerIds: string[]; requiredWorkers?: number };
export type ScheduleTemplate = { id: string; name: string; title: string; site: string; location: string; latitude?: number; longitude?: number; slots: SlotTemplate[] };
export type EditScope = 'one' | 'future' | 'series';
export type ShiftChanges = Partial<Pick<Shift, 'title' | 'site' | 'location' | 'latitude' | 'longitude' | 'date' | 'start' | 'end' | 'team' | 'workerIds' | 'requiredWorkers'>>;

export function seriesTargets(state: Pick<State, 'shifts' | 'punches'>, shift: Shift, scope: EditScope): Shift[] {
  return state.shifts.filter(item => !item.archived && (scope === 'one' ? item.id === shift.id : !!shift.seriesId && item.seriesId === shift.seriesId && (shift.slotId ? item.slotId === shift.slotId : item.start === shift.start && item.end === shift.end) && (scope !== 'future' || item.date >= shift.date)) && !state.punches.some(punch => punch.shiftId === item.id));
}

export function editSeries(state: State, id: string, changes: ShiftChanges, scope: EditScope): State {
  if (state.role !== 'admin') return state;
  const shift = state.shifts.find(item => item.id === id);
  if (!shift) return state;
  const targets = new Set(seriesTargets(state, shift, scope).map(item => item.id));
  return { ...state, shifts: state.shifts.map(item => targets.has(item.id) ? { ...item, ...changes, date: scope === 'one' ? changes.date ?? item.date : item.date } : item) };
}

// UTC is used only as a calendar-day index; local DST changes must not make
// adjacent dates overlap. These are roster wall-clock times in one workspace.
export function rosterInterval(date: string, start: string, end: string): [number, number] {
  const day = Date.parse(`${date}T00:00:00Z`) / 60000;
  const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
  const a = minutes(start), b = minutes(end);
  return [day + a, day + b + (b < a ? 1440 : 0)];
}

export function validateRoster(candidates: readonly Shift[], workers: State['workers'], existing: readonly Shift[]): string | null {
  const people = new Map(workers.filter(worker => !worker.archived).map(worker => [worker.id, worker]));
  const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
  const knownIds = new Set(candidates.map(shift => shift.id));
  const roster = existing.filter(shift => !shift.archived && !knownIds.has(shift.id));
  for (const shift of candidates) {
    if (!clock.test(shift.start) || !clock.test(shift.end) || shift.start === shift.end) return 'Choose different valid start and end times.';
    if (!shift.workerIds.length) return 'Assign at least one active worker to every time slot.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(shift.date) || !Number.isFinite(Date.parse(shift.date)) || new Date(shift.date).toISOString().slice(0, 10) !== shift.date) return 'Choose a valid start date.';
    const [a, b] = rosterInterval(shift.date, shift.start, shift.end);
    for (const id of shift.workerIds) {
      const worker = people.get(id);
      if (!worker) return 'Assign at least one active worker to every time slot.';
      for (let day = Math.floor(a / 1440); day <= Math.floor((b - 1) / 1440); day++) {
        const date = new Date(day * 86400000);
        const key = date.toISOString().slice(0, 10);
        if (worker.availableDays && !worker.availableDays.includes(date.getUTCDay()) || worker.unavailableDates?.includes(key)) return `${worker.name} is unavailable on ${key}.`;
      }
      const conflict = roster.find(other => {
        if (!other.workerIds.includes(id)) return false;
        const [c, d] = rosterInterval(other.date, other.start, other.end);
        return a < d && c < b;
      });
      if (conflict) return `${worker.name} already has ${conflict.title} on ${conflict.date}, ${conflict.start}–${conflict.end}.`;
    }
    roster.push(shift);
  }
  return null;
}

export function copyPreviousWeek(shifts: readonly Shift[], targetDate: string, copyKey: string, workerId?: string): Omit<Shift, 'id' | 'status'>[] {
  const target = Date.parse(`${targetDate}T00:00:00Z`);
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 10) !== targetDate) return [];
  const from = new Date(target - 7 * 86400000).toISOString().slice(0, 10);
  return shifts.filter(shift => !shift.archived && shift.date >= from && shift.date < targetDate && (!workerId || shift.workerIds.includes(workerId))).map(({ id: _id, status: _status, archived: _archived, ...shift }) => ({
    ...shift, date: new Date(Date.parse(`${shift.date}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10),
    seriesId: shift.seriesId ? `${copyKey}-${shift.seriesId}` : undefined,
    workerIds: workerId ? [workerId] : [...shift.workerIds],
  }));
}
