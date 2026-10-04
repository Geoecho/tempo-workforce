// Safe wrapper: Expo Go (SDK 53+) throws when expo-notifications is imported on Android.
// Fall back to no-ops there so the rest of the app still loads. Use a development build for reminders.
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type * as N from 'expo-notifications';

let mod: typeof N | null = null;
const inExpoGo = Constants.executionEnvironment === 'storeClient';
if (!(Platform.OS === 'android' && inExpoGo)) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try { mod = require('expo-notifications'); } catch { mod = null; }
}

export type { NotificationResponse, NotificationPermissionsStatus } from 'expo-notifications';
export const available = !!mod;
const noopAsync = async () => undefined as never;

export const setNotificationHandler: typeof N.setNotificationHandler = mod?.setNotificationHandler ?? (() => {});
export const getAllScheduledNotificationsAsync: typeof N.getAllScheduledNotificationsAsync = mod?.getAllScheduledNotificationsAsync ?? (async () => []);
export const cancelScheduledNotificationAsync: typeof N.cancelScheduledNotificationAsync = mod?.cancelScheduledNotificationAsync ?? noopAsync;
export const setNotificationChannelAsync: typeof N.setNotificationChannelAsync = mod?.setNotificationChannelAsync ?? (async () => null);
export const getPermissionsAsync: typeof N.getPermissionsAsync = mod?.getPermissionsAsync ?? (async () => ({ granted: false, canAskAgain: false, expires: 'never', status: 'denied' } as N.NotificationPermissionsStatus));
export const requestPermissionsAsync: typeof N.requestPermissionsAsync = mod?.requestPermissionsAsync ?? (async () => ({ granted: false, canAskAgain: false, expires: 'never', status: 'denied' } as N.NotificationPermissionsStatus));
export const scheduleNotificationAsync: typeof N.scheduleNotificationAsync = mod?.scheduleNotificationAsync ?? (async () => '');
export const clearLastNotificationResponse: typeof N.clearLastNotificationResponse = mod?.clearLastNotificationResponse ?? (() => {});
export const getLastNotificationResponse: typeof N.getLastNotificationResponse = mod?.getLastNotificationResponse ?? (() => null);
export const addNotificationResponseReceivedListener: typeof N.addNotificationResponseReceivedListener = mod?.addNotificationResponseReceivedListener ?? (() => ({ remove: () => {} }));
export const AndroidImportance = (mod?.AndroidImportance ?? { DEFAULT: 3 }) as typeof N.AndroidImportance;
export const IosAuthorizationStatus = (mod?.IosAuthorizationStatus ?? { PROVISIONAL: 3 }) as typeof N.IosAuthorizationStatus;
export const SchedulableTriggerInputTypes = (mod?.SchedulableTriggerInputTypes ?? { DATE: 'date' }) as typeof N.SchedulableTriggerInputTypes;

export const getExpoPushTokenAsync: typeof N.getExpoPushTokenAsync = mod?.getExpoPushTokenAsync ?? (async () => { throw new Error('Push notifications need an installed build.'); });
