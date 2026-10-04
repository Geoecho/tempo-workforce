import type { State } from './data';

// Archive one filtered selection in a single update; never remove live attendance.
export function archiveShiftGroup(state: State, ids: readonly string[]): State {
  if (state.role !== 'admin') return state;
  const selected = new Set(ids);
  const latest = new Map<string, typeof state.punches[number]>();
  for (const punch of state.punches) {
    const key = `${punch.shiftId}:${punch.workerId}`;
    const previous = latest.get(key);
    if (!previous || punch.at >= previous.at) latest.set(key, punch);
  }
  const active = new Set([...latest.values()].filter(punch => punch.type === 'in').map(punch => punch.shiftId));
  let changed = false;
  const shifts = state.shifts.map(shift => {
    if (!selected.has(shift.id) || shift.archived || active.has(shift.id)) return shift;
    changed = true;
    return { ...shift, archived: true };
  });
  return changed ? { ...state, shifts } : state;
}

export function restoreShiftRecord(state: State, id: string): State {
  if (state.role !== 'admin') return state;
  return { ...state, shifts: state.shifts.map(shift => shift.id === id ? { ...shift, archived: false } : shift) };
}
