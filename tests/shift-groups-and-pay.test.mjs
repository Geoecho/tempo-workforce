import assert from 'node:assert/strict';
import test from 'node:test';
import { archiveShiftGroup, restoreShiftRecord } from '../src/lib/shift-groups.ts';
import { monthlyHourlyRate } from '../src/lib/monthly-pay.ts';

test('group archive preserves attendance, keeps active shifts, and ignores unselected shifts', () => {
  const state = { role: 'admin', shifts: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], punches: [{ id: 'p', workerId: 'w', shiftId: 'b', type: 'in', at: '2026-10-04T08:00:00Z' }] };
  const next = archiveShiftGroup(state, ['a', 'b']);
  assert.equal(next.shifts[0].archived, true);
  assert.equal(next.shifts[1].archived, undefined);
  assert.equal(next.shifts[2].archived, undefined);
  assert.strictEqual(next.punches, state.punches);
  assert.strictEqual(archiveShiftGroup({ ...state, role: 'worker' }, ['a']).shifts, state.shifts);
});

test('group archive checks latest attendance by timestamp instead of array order', () => {
  const state = { role: 'admin', shifts: [{ id: 'a' }], punches: [{ shiftId: 'a', workerId: 'w', type: 'out', at: '2026-10-04T16:00:00Z' }, { shiftId: 'a', workerId: 'w', type: 'in', at: '2026-10-04T08:00:00Z' }] };
  assert.equal(archiveShiftGroup(state, ['a']).shifts[0].archived, true);
});

test('monthly hourly equivalent follows the editable contracted hours', () => {
  assert.equal(monthlyHourlyRate(3200, 160), 20);
  assert.equal(monthlyHourlyRate(3200, 128), 25);
  assert.equal(monthlyHourlyRate(3100, 160), 19.38);
  for (const hours of [0, -1, NaN, 745]) assert.equal(monthlyHourlyRate(3200, hours), null);
});

test('removal and restoration retain assignments, series and pay history, even without punches', () => {
  const shift = { id: 'a', title: 'Netaville', workerIds: ['w'], seriesId: 'monthly', date: '2026-10-05', start: '06:00', end: '12:00' };
  const state = { role: 'admin', shifts: [shift], punches: [] };
  const archived = archiveShiftGroup(state, ['a']);
  assert.equal(archived.shifts.length, 1);
  const restored = restoreShiftRecord(archived, 'a');
  assert.deepEqual(restored.shifts[0], { ...shift, archived: false });
  assert.strictEqual(restored.punches, state.punches);
  assert.strictEqual(restoreShiftRecord({ ...archived, role: 'worker' }, 'a').shifts, archived.shifts);
});
