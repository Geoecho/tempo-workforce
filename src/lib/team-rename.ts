import type { State } from './data';

export function renameTeamInState(state: State, oldName: string, rawName: string): State {
  const name = rawName.trim();
  const matches = (value: string) => value.toLowerCase() === oldName.toLowerCase();
  const existing = [...(state.teams ?? []), ...state.workers.map(w => w.team), ...state.shifts.map(s => s.team)];
  if (state.role !== 'admin' || !name || name.length > 50 || !existing.some(matches) || existing.some(value => !matches(value) && value.toLowerCase() === name.toLowerCase())) return state;
  return {
    ...state,
    teams: [...new Set([...(state.teams ?? []).map(value => matches(value) ? name : value), name])],
    workers: state.workers.map(worker => matches(worker.team) ? { ...worker, team: name } : worker),
    shifts: state.shifts.map(shift => matches(shift.team) ? { ...shift, team: name } : shift),
  };
}

export function removeTeamInState(state: State, oldName: string, rawDestination: string): State {
  const destination = rawDestination.trim();
  const matches = (value: string) => value.toLowerCase() === oldName.toLowerCase();
  const names = [...(state.teams ?? []), ...state.workers.map(w => w.team), ...state.shifts.map(s => s.team)];
  if (state.role !== 'admin' || !destination || destination.length > 50 || matches(destination) || !names.some(matches)) return state;
  return {
    ...state,
    teams: [...new Set([...(state.teams ?? []).filter(value => !matches(value)), destination])],
    workers: state.workers.map(worker => matches(worker.team) ? { ...worker, team: destination } : worker),
    shifts: state.shifts.map(shift => matches(shift.team) ? { ...shift, team: destination } : shift),
  };
}
