import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import type { ShiftNotification, State } from './data';

type Marks = Record<string, { dismissed?: boolean; readAt?: string }>;
type StoredInbox = { scope: string; marks: Marks };

// Attendance is already permission-filtered by tempo_snapshot. Only admins
// turn successful clock-in records into inbox entries; stable IDs avoid duplicates.
export function clockInNotifications(state: State): ShiftNotification[] {
  if (state.role !== 'admin') return [];
  return state.punches.filter(punch => punch.type === 'in').map(punch => {
    const worker = state.workers.find(item => item.id === punch.workerId);
    const shift = state.shifts.find(item => item.id === punch.shiftId);
    return {
      id: `clock-in:${punch.id}`, workerId: punch.workerId, shiftId: punch.shiftId,
      kind: 'clocked-in', title: `${worker?.name ?? 'A worker'} clocked in`,
      body: `${shift?.title ?? 'Shift'}${shift?.site ? ` - ${shift.site}` : ''}`,
      createdAt: punch.at, readAt: null,
    };
  });
}

// Dismissal is private to this account and device; attendance is never deleted.
export function useNotificationInbox(scope: string, items: ShiftNotification[]) {
  const [stored, setStored] = useState<StoredInbox>({ scope: '', marks: {} });
  const current = useRef(stored);
  const queue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(`tempo-inbox-v1:${scope}`).then(raw => {
      const parsed = raw ? JSON.parse(raw) : {};
      const next = { scope, marks: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Marks : {} };
      if (active) { current.current = next; setStored(next); }
    }).catch(() => {
      if (active) { const next = { scope, marks: {} }; current.current = next; setStored(next); }
    });
    return () => { active = false; };
  }, [scope]);

  const update = (ids: string[], mark: Marks[string]) => {
    const task = queue.current.catch(() => {}).then(async () => {
      if (current.current.scope !== scope) throw new Error('Notifications are still loading. Please try again.');
      const marks = { ...current.current.marks };
      for (const id of ids) marks[id] = { ...marks[id], ...mark };
      const next = { scope, marks };
      await AsyncStorage.setItem(`tempo-inbox-v1:${scope}`, JSON.stringify(next.marks));
      if (current.current.scope === scope) { current.current = next; setStored(next); }
    });
    queue.current = task;
    return task;
  };
  return {
    notifications: stored.scope !== scope ? [] : items.filter(item => !stored.marks[item.id]?.dismissed)
      .map(item => ({ ...item, readAt: stored.marks[item.id]?.readAt ?? item.readAt })),
    dismissNotification: (id: string) => update([id], { dismissed: true }),
    markLocalNotificationRead: (id: string) => update([id], { readAt: new Date().toISOString() }),
    markLocalNotificationsRead: (ids: string[]) => update(ids, { readAt: new Date().toISOString() }),
  };
}
