import { Platform } from 'react-native';
import { notificationsSupported } from './notification-support';

export async function requestReminderPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const Notifications = await import('expo-notifications');
  const allowed = (status: import('expo-notifications').NotificationPermissionsStatus) => status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('shift-reminders', {
      name: 'Shift reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (allowed(current)) return true;
  return allowed(await Notifications.requestPermissionsAsync());
}
