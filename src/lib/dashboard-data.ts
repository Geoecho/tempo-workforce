import { localDate, paySummary } from './data.ts';
import type { Punch, Worker } from './data.ts';

export type DashboardDay = { date: string; paidSeconds: number; earningsCents: number; people: number };

/** Aggregate the authorized, already-loaded records. No network work is needed. */
export function dashboardWeek(punches: Punch[], workers: Worker[], now: number): DashboardDay[] {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 6 + index);
    return { date: localDate(date), paidSeconds: 0, earningsCents: 0, people: 0 };
  });
  const ids = new Set(workers.map(worker => worker.id));
  const grouped = new Map<string, Punch[]>();
  for (const punch of punches) {
    const date = punch.workDate ?? localDate(new Date(punch.at));
    if (!ids.has(punch.workerId) || date < days[0].date || date > days[6].date) continue;
    const key = `${punch.workerId}:${date}`;
    const events = grouped.get(key) ?? [];
    events.push(punch);
    grouped.set(key, events);
  }
  return days.map(day => {
    for (const worker of workers) {
      const events = grouped.get(`${worker.id}:${day.date}`);
      if (!events) continue;
      const summary = paySummary(events, worker, day.date, now);
      day.paidSeconds += summary.payableSeconds;
      day.earningsCents += summary.earningsCents;
      if (events.some(event => event.type === 'in')) day.people++;
    }
    return day;
  });
}
