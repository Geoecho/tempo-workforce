import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { activeBreak, formatDay, shiftHasEnded, today } from './data';
import { useStore } from './store';

export const WATCH_SCAN_NOTIFICATION = 'tempo-watch-scan';

export function WatchSync() {
  const { ready, role, selectedWorkerId, shifts, punches, breaks } = useStore();
  const active = shifts.find(shift => !shift.archived && shift.date === today() && shift.workerIds.includes(selectedWorkerId)
    && punches.filter(punch => punch.shiftId === shift.id && punch.workerId === selectedWorkerId).sort((a, b) => b.at.localeCompare(a.at))[0]?.type === 'in');
  const next = shifts.filter(shift => !shift.archived && shift.workerIds.includes(selectedWorkerId) && !shiftHasEnded(shift))
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))[0];
  const lastCompleted = shifts.filter(shift => !shift.archived && shift.workerIds.includes(selectedWorkerId) && shift.date === today()
    && punches.some(punch => punch.shiftId === shift.id && punch.workerId === selectedWorkerId && punch.type === 'out'))[0];
  const shift = active ?? next ?? lastCompleted;
  const onBreak = active ? activeBreak(breaks, punches, active.id, selectedWorkerId) : null;
  const status = onBreak ? 'onBreak' : active ? 'onShift' : next ? 'upcoming' : lastCompleted ? 'complete' : 'none';
  const context = JSON.stringify({
    status: role === 'worker' ? status : 'none',
    title: role === 'worker' ? shift?.title ?? 'No shift scheduled' : 'Sign in as a worker',
    site: role === 'worker' ? shift?.site ?? '' : '',
    time: role === 'worker' && shift ? onBreak ? 'Paid break' : active ? 'Checked in' : status === 'complete' ? 'Done today' : shift.start : '',
    note: role === 'worker' && shift ? `${formatDay(shift.date)} · ${shift.start}–${shift.end}` : 'Open Tempo on iPhone',
  });

  useEffect(() => {
    if (!ready || Platform.OS !== 'ios' || Constants.expoGoConfig) return;
    let cancelled = false;
    let removeListener: (() => void) | undefined;
    void import('@plevo/expo-watch-connectivity').then(async ({ WatchConnectivity }) => {
      if (!WatchConnectivity.isSupported) return;
      const publish = () => {
        if (!cancelled && WatchConnectivity.sessionState.activationState === 'activated') {
          void WatchConnectivity.updateApplicationContext(JSON.parse(context)).catch(() => {});
        }
      };
      const activation = WatchConnectivity.addActivationListener(({ activationState }) => {
        if (activationState === 'activated') publish();
      });
      const subscription = WatchConnectivity.addMessageListener(({ message, replyId }) => {
        if (message.action !== 'openScanner') return;
        const reply = (text: string) => { if (replyId) WatchConnectivity.replyToMessage(replyId, { message: text }); };
        if (role !== 'worker') return reply('Sign in as a worker on iPhone');
        if (AppState.currentState === 'active') {
          router.push('/scan');
          return reply('Scanner opened on iPhone');
        }
        void Notifications.scheduleNotificationAsync({
          content: { title: 'Scan your site code', body: 'Tap to open the Tempo scanner on iPhone.', data: { kind: WATCH_SCAN_NOTIFICATION }, sound: false },
          trigger: null,
        }).then(() => reply('Tap the iPhone notification')).catch(() => reply('Open Tempo on iPhone to scan'));
      });
      removeListener = () => { activation.remove(); subscription.remove(); };
      await WatchConnectivity.activate();
      publish();
    }).catch(() => { /* Expo Go has no WatchConnectivity native module. */ });
    return () => { cancelled = true; removeListener?.(); };
  }, [ready, role, context]);
  return null;
}
