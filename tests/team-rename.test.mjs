import assert from 'node:assert/strict';
import test from 'node:test';
import { renameTeamInState, removeTeamInState } from '../src/lib/team-rename.ts';

const state = () => ({ role: 'admin', teams: ['Stage', 'Security'], workers: [{ id: 'w1', team: 'Stage', hourlyRate: 20 }, { id: 'w2', team: 'Security' }, { id: 'w3', team: 'Stage', archived: true }], shifts: [{ id: 's1', team: 'Stage', workerIds: ['w1'], archived: true }, { id: 's2', team: 'Security', workerIds: ['w2'] }], punches: [{ id: 'p1', workerId: 'w1', shiftId: 's1', rate: 20 }] });
test('renaming updates active and archived assignments without changing attendance or pay', () => {
  const before = state();
  const after = renameTeamInState(before, 'Stage', '  Production  ');
  assert.deepEqual(after.teams, ['Production', 'Security']);
  assert.equal(after.workers[0].team, 'Production');
  assert.equal(after.workers[2].team, 'Production');
  assert.equal(after.shifts[0].team, 'Production');
  assert.deepEqual(after.shifts[0].workerIds, ['w1']);
  assert.equal(after.punches, before.punches);
  assert.equal(after.workers[0].hourlyRate, 20);
  assert.equal(after.workers[1], before.workers[1]);
  assert.equal(before.workers[0].team, 'Stage');
});
test('removing a team transfers members and shifts without deleting history', () => {
  const before = state();
  const after = removeTeamInState(before, 'Stage', 'Security');
  assert.deepEqual(after.teams, ['Security']);
  assert.equal(after.workers.length, before.workers.length);
  assert.equal(after.shifts.length, before.shifts.length);
  assert.equal(after.workers[0].team, 'Security');
  assert.equal(after.workers[2].team, 'Security');
  assert.equal(after.shifts[0].team, 'Security');
  assert.equal(after.punches, before.punches);
  assert.deepEqual(after.shifts[0].workerIds, ['w1']);
  assert.equal(removeTeamInState(before, 'Stage', 'Stage'), before);
  assert.equal(removeTeamInState(before, 'Stage', ''), before);
  const worker = { ...before, role: 'worker' };
  assert.equal(removeTeamInState(worker, 'Stage', 'Security'), worker);
});
test('rejects collisions, invalid names and worker actions, but permits capitalization changes', () => {
  const before = state();
  for (const name of ['', 'security', 'x'.repeat(51)]) assert.equal(renameTeamInState(before, 'Stage', name), before);
  assert.equal(renameTeamInState(before, 'Unknown', 'Production'), before);
  const worker = { ...before, role: 'worker' };
  assert.equal(renameTeamInState(worker, 'Stage', 'Production'), worker);
  assert.equal(renameTeamInState(before, 'Stage', 'STAGE').workers[0].team, 'STAGE');
});
