import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRoster } from '../src/lib/planning.ts';
const validateShiftSlots = (dates, slots, workers, existing) => validateRoster(dates.flatMap(date => slots.map(slot => ({...slot, date, id: `${date}-${slot.id}`, title: 'Test', status: 'upcoming'}))), workers, existing);

const dates = ['2026-10-05', '2026-10-06'];
const workers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const slots = [
  { id: '1', start: '06:00', end: '12:00', workerIds: ['a'] },
  { id: '2', start: '12:00', end: '18:00', workerIds: ['b'] },
  { id: '3', start: '18:00', end: '23:00', workerIds: ['c'] },
];
test('three daily slots allow separate people and consecutive assignments', () => {
  assert.equal(validateShiftSlots(dates, slots, workers, []), null);
  assert.equal(validateShiftSlots(dates, slots.map(slot => ({ ...slot, workerIds: ['a'] })), workers, []), null);
});
test('conflicts cover other slots and every date in the recurring series', () => {
  assert.match(validateShiftSlots(dates, [slots[0], { ...slots[1], start: '11:00', workerIds: ['a'] }], workers, []), /already has/);
  const existing = [{ date: dates[1], start: '10:00', end: '13:00', workerIds: ['a'] }];
  assert.match(validateShiftSlots(dates, slots, workers, existing), /already has/);
  assert.equal(validateShiftSlots(dates, slots, workers, existing.map(shift => ({ ...shift, archived: true }))), null);
});
test('invalid times and inactive or missing assignments are refused', () => {
  assert.equal(validateShiftSlots(dates, [{ ...slots[0], end: '02:00' }], workers, []), null);
  assert.match(validateShiftSlots(dates, [{ ...slots[0], end: slots[0].start }], workers, []), /valid start and end/);
  assert.match(validateShiftSlots(dates, [{ ...slots[0], workerIds: [] }], workers, []), /active worker/);
  assert.match(validateShiftSlots(dates, [slots[0]], [{ id: 'a', archived: true }], []), /active worker/);
});
