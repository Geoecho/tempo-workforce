import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useFeedback } from './feedback';
import { useStore } from './store';
import { WATCH_SCAN_NOTIFICATION } from './WatchSync';

type ReminderShift = { id: string; date: string; start: string; title: string; site: string };
const KIND = 'tempo-shift-reminder';
let queue: Promise<void> = Promise.resolve();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function syncReminders(shifts: ReminderShift[]) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of scheduled) {
    if (item.content.data?.kind === KIND) await Notifications.cancelScheduledNotificationAsync(item.identifier);
  }
  if (!shifts.length) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('shift-reminders', {
      name: 'Shift reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) return;
  for (const shift of shifts.slice(0, 40)) {
    const start = new Date(`${shift.date}T${shift.start}:00`).getTime();
    const reminder = start - 60 * 60 * 1000;
    if (!Number.isFinite(reminder) || reminder <= Date.now() + 30_000) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Shift in 1 hour',
        body: `${shift.title} · ${shift.site}`,
        data: { kind: KIND, shiftId: shift.id },
        sound: false,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(reminder), channelId: 'shift-reminders' },
    });
  }
}

function enqueue(shifts: ReminderShift[]) {
  queue = queue.catch(() => {}).then(() => syncReminders(shifts));
  return queue;
}

export function ShiftReminders() {
  const { ready, role, selectedWorkerId, shifts, notifications } = useStore();
  const { ready: feedbackReady, reminders } = useFeedback();
  const seenNotifications = useRef<Set<string> | null>(null);
  const specification = JSON.stringify(shifts
    .filter(shift => !shift.archived && shift.workerIds.includes(selectedWorkerId))
    .map(({ id, date, start, title, site }) => ({ id, date, start, title, site }))
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)));

  useEffect(() => {
    if (!ready || !feedbackReady) return;
    void enqueue(reminders && role === 'worker' ? JSON.parse(specification) as ReminderShift[] : []);
  }, [ready, feedbackReady, reminders, role, specification]);
  useEffect(() => () => { void enqueue([]); }, []);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      if (data?.kind === WATCH_SCAN_NOTIFICATION) {
        router.push('/scan');
        Notifications.clearLastNotificationResponse();
        return;
      }
      if (data?.kind !== KIND && data?.kind !== 'tempo-shift-change') return;
      const shiftId = data.shiftId;
      const canOpen = typeof shiftId === 'string' && shifts.some(shift => shift.id === shiftId && !shift.archived && shift.workerIds.includes(selectedWorkerId));
      router.push(canOpen ? `/shift/${shiftId}` as never : '/notifications');
      Notifications.clearLastNotificationResponse();
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) open(last);
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [shifts, selectedWorkerId]);

  useEffect(() => {
    if (!ready || !feedbackReady || !reminders || role !== 'worker') {
      seenNotifications.current = null;
      return;
    }
    const ids = new Set(notifications.map(item => item.id));
    if (seenNotifications.current) {
      for (const item of notifications) {
        if (item.readAt || seenNotifications.current.has(item.id)) continue;
        void Notifications.scheduleNotificationAsync({
          content: { title: item.title, body: item.body, data: { kind: 'tempo-shift-change', shiftId: item.shiftId }, sound: false },
          trigger: null,
        }).catch(() => {});
      }
    }
    seenNotifications.current = ids;
  }, [ready, feedbackReady, reminders, role, notifications]);
  return null;
}
