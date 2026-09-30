import { createContext } from 'react';
import type { BreakEvent, Currency, PaySummary, Punch, Shift, ShiftNotification, State, TimeApproval, Worker } from './data';

export type Result = { ok: boolean; message: string; type?: 'in' | 'out'; pay?: PaySummary };
export type Store = State & {
  ready: boolean;
  online: boolean;
  syncError: string | null;
  accountEmail: string | null;
  notifications: ShiftNotification[];
  approvals: TimeApproval[];
  breaks: BreakEvent[];
  setRole: (role: State['role']) => void;
  setSelectedWorker: (id: string) => void;
  addTeam: (name: string) => void;
  addWorker: (worker: Omit<Worker, 'id' | 'initials' | 'color'>) => void;
  updateWorker: (id: string, changes: Partial<Pick<Worker, 'name' | 'role' | 'team' | 'phone' | 'photoUri' | 'hourlyRate'>>) => void;
  removeWorker: (id: string) => void;
  restoreWorker: (id: string) => void;
  setCurrency: (currency: Currency) => void;
  setWorkspaceName: (name: string) => void;
  addShift: (shift: Omit<Shift, 'id' | 'status'>) => void;
  addShifts: (shifts: Omit<Shift, 'id' | 'status'>[]) => void;
  updateShift: (id: string, changes: Partial<Pick<Shift, 'title' | 'site' | 'location' | 'latitude' | 'longitude' | 'date' | 'start' | 'end' | 'team' | 'workerIds'>>) => void;
  removeShift: (id: string) => void;
  restoreShift: (id: string) => void;
  scan: (payload: string, source?: Punch['source']) => Result | Promise<Result>;
  toggleBreak: (shiftId: string) => Promise<Result>;
  issueQr: (shiftId: string) => Promise<string>;
  markNotificationRead: (id: string) => Promise<void>;
  reviewTime: (workerId: string, date: string, approve: boolean) => Promise<Result>;
  reset: () => void;
  inviteWorker: (workerId: string, email: string) => Promise<Result>;
  signOut: () => Promise<void>;
};

export const Context = createContext<Store | null>(null);
