import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardWeek } from '../src/lib/dashboard-data.ts';
import { localDate, setPayRegistry } from '../src/lib/data.ts';

const now = new Date(2026, 9, 7, 22).getTime();
const day = localDate(new Date(now));
const people = [
  { id: 'a', name: 'A', initials: 'A', role: 'Crew', team: 'One', color: '#fff', hourlyRate: 50 },
  { id: 'b', name: 'B', initials: 'B', role: 'Crew', team: 'Two', color: '#fff', hourlyRate: 30 },
];
const event = (id, workerId, type, hour, extra = {}) => ({ id, workerId, shiftId: workerId, type, at: new Date(2026, 9, 7, hour).toISOString(), workDate: day, source: 'correction', ...extra });

test('dashboard totals preserve the pay cap and rate recorded at check-in', () => {
  setPayRegistry({}, {});
  const punches = [event('1', 'a', 'in', 8, { rateAtCheckIn: 20 }), event('2', 'a', 'out', 20), event('3', 'b', 'in', 8), event('4', 'b', 'out', 13)];
  const week = dashboardWeek(punches, people, now);
  assert.equal(week[6].paidSeconds, 15 * 3600);
  assert.equal(week[6].earningsCents, 35000);
  assert.equal(week[6].people, 2);
  assert.equal(punches.length, 4);
});

test('employee charts include only the selected worker and handle a running session', () => {
  const week = dashboardWeek([event('1', 'a', 'in', 20), event('2', 'b', 'in', 8), event('3', 'b', 'out', 18)], [people[0]], now);
  assert.equal(week[6].paidSeconds, 2 * 3600);
  assert.equal(week[6].earningsCents, 10000);
  assert.equal(week[6].people, 1);
});

test('an empty week has seven actual calendar days and no invented activity', () => {
  const week = dashboardWeek([], [], now);
  assert.equal(week.length, 7);
  assert.equal(week[0].date, '2026-10-01');
  assert.equal(week[6].date, day);
  assert.ok(week.every(value => value.paidSeconds === 0 && value.earningsCents === 0 && value.people === 0));
});

test('overnight punches stay on the shift work date and old records stay out of the chart', () => {
  const previous = localDate(new Date(2026, 9, 6));
  const events = [
    { ...event('1', 'a', 'in', 1), at: new Date(2026, 9, 6, 22).toISOString(), workDate: previous },
    { ...event('2', 'a', 'out', 6), workDate: previous },
    { ...event('old', 'a', 'in', 8), workDate: '2026-09-20' },
  ];
  const week = dashboardWeek(events, [people[0]], now);
  assert.equal(week[5].paidSeconds, 8 * 3600);
  assert.equal(week[6].paidSeconds, 0);
  assert.equal(week.reduce((sum, value) => sum + value.earningsCents, 0), 40000);
});
