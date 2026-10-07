import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { PayConfig, setPayRegistry, uid } from './data';
import { useStore } from './store';
import { useSharedTasks } from './shared-tasks';
import { monthlyHourlyRate } from './monthly-pay';

// Device-local extras: role tags, per-event overrides, and person tasks with photo proof.
export type RoleTag = { id: string; name: string; color: string; details: string; rate?: number };
export type RoleOverride = { roleIds?: string[]; details?: string };
export type Task = { id: string; workerId: string; title: string; createdAt: string; doneAt?: string; proofUri?: string; hasProof?: boolean };
type Data = { roles: RoleTag[]; workerRoles: Record<string, string[]>; overrides: Record<string, RoleOverride>; tasks: Task[]; pay: Record<string, PayConfig>; shiftPay: Record<string, number> };
const KEY = 'tempo-extras-v1';
const empty: Data = { roles: [], workerRoles: {}, overrides: {}, tasks: [], pay: {}, shiftPay: {} };
export const ROLE_COLORS = ['#CDE8DF', '#E8DFF5', '#F9E5CA', '#DCE7F6', '#F5DDE1', '#E6EBC8'];

type Extras = Data & {
  taskError: string;
  tasksReady: boolean;
  addRole: (name: string, details: string, rate?: number) => string;
  updateRole: (id: string, changes: Partial<Omit<RoleTag, 'id'>>) => void;
  removeRole: (id: string) => void;
  setWorkerRoles: (workerId: string, roleIds: string[]) => void;
  setOverride: (shiftId: string, workerId: string, value: RoleOverride | null) => void;
  assignment: (shiftId: string, workerId: string) => { roles: RoleTag[]; details: string; overridden: boolean };
  setWorkerPay: (workerId: string, cfg: PayConfig) => void;
  setShiftPay: (shiftId: string, amount: number | null) => void;
  addTask: (workerId: string, title: string) => Promise<void>;
  completeTask: (id: string, proofUri: string) => Promise<void>;
  reopenTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
};
const Ctx = createContext<Extras | null>(null);

export function ExtrasProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(empty);
  const [ready, setReady] = useState(false);
  const { online, accountEmail, role, workers, updateWorker, recordLocalTaskCompletion } = useStore();
  const shared = useSharedTasks(online, accountEmail, role === 'admin', ready, data.tasks);
  useEffect(() => { AsyncStorage.getItem(KEY).then(raw => { if (raw) setData({ ...empty, ...JSON.parse(raw) }); }).catch(() => {}).finally(() => setReady(true)); }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {}); }, [data, ready]);
  const addRole = useCallback((name: string, details: string, rate?: number) => {
    const id = uid();
    setData(d => ({ ...d, roles: [...d.roles, { id, name: name.trim(), details: details.trim(), rate, color: ROLE_COLORS[d.roles.length % ROLE_COLORS.length] }] }));
    return id;
  }, []);
  const updateRole = useCallback((id: string, changes: Partial<Omit<RoleTag, 'id'>>) => setData(d => ({ ...d, roles: d.roles.map(r => r.id === id ? { ...r, ...changes } : r) })), []);
  const removeRole = useCallback((id: string) => setData(d => ({
    ...d,
    roles: d.roles.filter(r => r.id !== id),
    workerRoles: Object.fromEntries(Object.entries(d.workerRoles).map(([k, v]) => [k, v.filter(x => x !== id)])),
    overrides: Object.fromEntries(Object.entries(d.overrides).map(([k, v]) => [k, { ...v, roleIds: v.roleIds?.filter(x => x !== id) }])),
  })), []);
  const setWorkerRoles = useCallback((workerId: string, roleIds: string[]) => setData(d => ({ ...d, workerRoles: { ...d.workerRoles, [workerId]: roleIds } })), []);
  const setOverride = useCallback((shiftId: string, workerId: string, value: RoleOverride | null) => setData(d => {
    const overrides = { ...d.overrides };
    if (value) overrides[`${shiftId}:${workerId}`] = value; else delete overrides[`${shiftId}:${workerId}`];
    return { ...d, overrides };
  }), []);
  const setWorkerPay = (workerId: string, cfg: PayConfig) => {
    const derived = cfg.type === 'fixed' ? monthlyHourlyRate(cfg.amount, cfg.monthlyHours ?? 160) : null;
    updateWorker(workerId, { payConfig: cfg, ...(derived !== null ? { hourlyRate: derived } : {}) });
    setData(d => ({ ...d, pay: { ...d.pay, [workerId]: cfg } }));
  };
  const setShiftPay = useCallback((shiftId: string, amount: number | null) => setData(d => {
    const shiftPay = { ...d.shiftPay };
    if (amount === null) delete shiftPay[shiftId]; else shiftPay[shiftId] = amount;
    return { ...d, shiftPay };
  }), []);
  const pay = { ...(online ? {} : data.pay), ...Object.fromEntries(workers.filter(worker => worker.payConfig).map(worker => [worker.id, worker.payConfig!])) };
  setPayRegistry(pay, data.shiftPay);
  const addTask = async (workerId: string, title: string) => {
    if (online) return shared.change('add', uid(), workerId, title);
    setData(d => ({ ...d, tasks: [{ id: uid(), workerId, title: title.trim(), createdAt: new Date().toISOString() }, ...d.tasks] }));
  };
  const completeTask = async (id: string, proofUri: string) => {
    if (online) return shared.change('complete', id, undefined, undefined, proofUri);
    const task = data.tasks.find(item => item.id === id);
    if (task) recordLocalTaskCompletion?.(task.id, task.workerId, task.title);
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, doneAt: new Date().toISOString(), proofUri } : t) }));
  };
  const reopenTask = async (id: string) => {
    if (online) return shared.change('reopen', id);
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, doneAt: undefined, proofUri: undefined } : t) }));
  };
  const removeTask = async (id: string) => {
    if (online) return shared.change('remove', id);
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));
  };
  const value: Extras = {
    ...data, pay, tasks: online ? shared.tasks : data.tasks, taskError: online ? shared.error : '', tasksReady: online ? shared.ready : ready, addRole, updateRole, removeRole, setWorkerRoles, setOverride, setWorkerPay, setShiftPay, addTask, completeTask, reopenTask, removeTask,
    assignment: (shiftId, workerId) => {
      const override = data.overrides[`${shiftId}:${workerId}`];
      const ids = override?.roleIds ?? data.workerRoles[workerId] ?? [];
      return { roles: ids.map(id => data.roles.find(r => r.id === id)).filter((r): r is RoleTag => !!r), details: override?.details ?? '', overridden: !!override };
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useExtras() { const v = useContext(Ctx); if (!v) throw new Error('ExtrasProvider missing'); return v; }
