import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import * as Notifications from './notifications';
const tokenKey = 'tempo-push-device-token';
export async function registerPushDevice() {
  if (!supabase || Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient') return;
  const status = await Notifications.getPermissionsAsync();
  if (!status.granted && status.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Push notifications are not configured for this build.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.rpc('tempo_register_push', { p_token: token, p_platform: Platform.OS });
  if (error) throw new Error('Could not connect push notifications. Try again from Settings.');
  await AsyncStorage.setItem(tokenKey, token);
}
export async function unregisterPushDevice() {
  const token = await AsyncStorage.getItem(tokenKey);
  if (!token || !supabase) return;
  const { error } = await supabase.rpc('tempo_unregister_push', { p_token: token });
  if (error) throw new Error('Could not disconnect notifications. Check your connection and try signing out again.');
  await AsyncStorage.removeItem(tokenKey);
}
