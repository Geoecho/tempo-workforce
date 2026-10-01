import type { Shift } from './data';

export type ShiftGroup = { key: string; shifts: Shift[] };

// Keep an existing series together on the schedule, including series created
// before Tempo stored an explicit series ID.
export function groupUpcomingShifts(shifts: Shift[]): ShiftGroup[] {
  const groups = new Map<string, ShiftGroup>();
  for (const shift of shifts) {
    const signature = shift.seriesId ?? [shift.title, shift.site, shift.location, shift.start, shift.end, [...shift.workerIds].sort().join(',')].join('|');
    const key = `${shift.date.slice(0, 7)}:${signature}`;
    const group = groups.get(key);
    if (group && !group.shifts.some(item => item.date === shift.date)) group.shifts.push(shift);
    else if (!group) groups.set(key, { key, shifts: [shift] });
    else groups.set(`${key}:${shift.id}`, { key: `${key}:${shift.id}`, shifts: [shift] });
  }
  return [...groups.values()];
}
