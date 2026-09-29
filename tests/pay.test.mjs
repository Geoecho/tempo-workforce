import assert from 'node:assert/strict';
import test from 'node:test';
import { paySummary } from '../src/lib/data.ts';

const worker = { id: 'w', name: 'Test Worker', hourlyRate: 30 };
const at = (hour, minute = 0) => new Date(2026, 8, 29, hour, minute).toISOString();
const punch = (type, shiftId, time, rateAtCheckIn) => ({ id: `${type}-${shiftId}-${time}`, type, shiftId, workerId: 'w', at: time, source: 'demo', rateAtCheckIn });

test('caps payable time across two shifts in one day while retaining actual time', () => {
  const events = [
    punch('in', 'a', at(7), 30), punch('out', 'a', at(13)),
    punch('in', 'b', at(14), 30), punch('out', 'b', at(19)),
  ];
  const result = paySummary(events, worker, '2026-09-29');
  assert.equal(result.actualMinutes, 660);
  assert.equal(result.payableMinutes, 600);
  assert.equal(result.excessMinutes, 60);
  assert.equal(result.earningsCents, 30000);
});

test('uses the rate captured at check-in when the profile rate changes', () => {
  const events = [punch('in', 'a', at(8), 40), punch('out', 'a', at(10))];
  const result = paySummary(events, worker, '2026-09-29');
  assert.equal(result.earningsCents, 8000);
});
