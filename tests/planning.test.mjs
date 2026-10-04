import test from 'node:test';
import assert from 'node:assert/strict';
import { copyPreviousWeek, editSeries, seriesTargets, validateRoster } from '../src/lib/planning.ts';
const workers = [{ id: 'a', name: 'Alex' }, { id: 'b', name: 'Sam' }];
const shift = (id, date, start, end, ids = ['a'], extras = {}) => ({ id, date, start, end, workerIds: ids, title: 'Night crew', site: 'Hall', location: 'Gate', team: 'A', status: 'upcoming', ...extras });
test('overnight roster detects next-day conflicts but permits adjacent slots', () => {
  const night = shift('night', '2026-10-05', '22:00', '06:00');
  assert.match(validateRoster([night], workers, [shift('early', '2026-10-06', '05:00', '08:00')]), /Alex already has/);
  assert.equal(validateRoster([night], workers, [shift('next', '2026-10-06', '06:00', '10:00')]), null);
  assert.equal(validateRoster([night], workers, [shift('early', '2026-10-06', '05:00', '08:00', ['b'])]), null);
  assert.match(validateRoster([night], [{ ...workers[0], unavailableDates: ['2026-10-06'] }], []), /unavailable on 2026-10-06/);
});
test('availability, malformed dates and inactive workers prevent assignments', () => {
  assert.match(validateRoster([shift('x', '2026-10-05', '09:00', '17:00')], [{ ...workers[0], availableDays: [2] }], []), /unavailable/);
  assert.match(validateRoster([shift('x', '2026-02-30', '09:00', '17:00')], workers, []), /valid start date/);
  assert.match(validateRoster([shift('x', '2026-10-05', '09:00', '17:00')], [{ ...workers[0], archived: true }], []), /active worker/);
});
test('future series edits preserve other daily slots, recorded occurrences and prior dates', () => {
  const shifts = [shift('old', '2026-10-04', '06:00', '12:00'), shift('selected', '2026-10-05', '06:00', '12:00'), shift('recorded', '2026-10-06', '06:00', '12:00'), shift('future', '2026-10-07', '06:00', '12:00'), shift('other-slot', '2026-10-07', '12:00', '18:00', ['b'], { slotId: 'pm' })].map(s => ({ seriesId: 'month', slotId: 'am', ...s }));
  const state = { role: 'admin', shifts, punches: [{ shiftId: 'recorded' }], workers };
  assert.deepEqual(seriesTargets(state, shifts[1], 'future').map(s => s.id), ['selected', 'future']);
  const next = editSeries(state, 'selected', { start: '07:00', date: '2030-01-01', workerIds: ['b'] }, 'future');
  assert.equal(next.shifts[3].date, '2026-10-07');
  assert.equal(next.shifts[2].start, '06:00');
  assert.equal(next.shifts[4].start, '12:00');
  assert.equal(next.shifts[0].start, '06:00');
  assert.equal(editSeries({ ...state, role: 'worker' }, 'selected', { title: 'Override' }, 'series').shifts[1].title, 'Night crew');
});

test('copying a week creates a separate series and supports a single worker roster', () => {
 const source=[shift('original','2026-10-05','22:00','06:00',['a','b'],{seriesId:'old',slotId:'night'}),shift('removed','2026-10-06','09:00','17:00',['a'],{archived:true}),shift('outside','2026-10-12','09:00','17:00')];
 const copies=copyPreviousWeek(source,'2026-10-12','new','a');
 assert.equal(copies.length,1); assert.equal(copies[0].date,'2026-10-12'); assert.equal(copies[0].seriesId,'new-old'); assert.equal(copies[0].slotId,'night'); assert.deepEqual(copies[0].workerIds,['a']); assert.equal(copies[0].id,undefined);
 assert.equal(copyPreviousWeek(source,'2026-02-30','new').length,0);
 assert.deepEqual(source[0].workerIds,['a','b']);
});
