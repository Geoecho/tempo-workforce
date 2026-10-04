// The form models a daily slot; validate complete dated rosters with planning.ts.
export type ShiftSlot = { id: string; start: string; end: string; workerIds: string[]; requiredWorkers?: number };
