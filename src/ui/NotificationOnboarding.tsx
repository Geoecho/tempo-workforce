import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, View } from 'react-native';
import { useStore } from '../lib/store';
import * as Notifications from '../lib/notifications';
import { registerPushDevice } from '../lib/push-registration';
import { requestReminderPermission } from '../lib/reminder-permission';
import { useFeedback } from '../lib/feedback';
import { Button, Card } from './components';
import { Text } from './LocalizedText';
import { useTheme } from './theme';

export function NotificationOnboarding() {
  const C = useTheme().colors;
  const { ready, online, accountEmail, role } = useStore();
  const { setReminders } = useFeedback();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const key = `tempo-notification-onboarding:${accountEmail ?? 'demo'}`;
  useEffect(() => {
    if (!ready || !online || Platform.OS === 'web' || !Notifications.available) return;
    let active = true;
    const initialize = async () => {
      const [seen, permission] = await Promise.all([AsyncStorage.getItem(key), Notifications.getPermissionsAsync()]);
      if (active && !seen && !permission.granted) setVisible(true);
      if (permission.granted) await registerPushDevice().catch(() => {});
    };
    void initialize().catch(() => {});
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void registerPushDevice().catch(() => {}); });
    return () => { active = false; listener.remove(); };
  }, [ready, online, key]);
  const finish = async () => { await AsyncStorage.setItem(key, 'seen'); setVisible(false); };
  const enable = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      if (!await requestReminderPermission()) { setMessage('Notifications are off. You can enable them in your device settings.'); return; }
      if (role === 'worker') await setReminders(true);
      await registerPushDevice(); await finish();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not enable notifications. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) void finish(); }}>
    <View style={{ flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 24 }}><Card style={{ width: '100%', maxWidth: 440, alignSelf: 'center', padding: 28 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><Bell size={28} color={C.green} /></View>
      <Text style={{ color: C.ink, fontSize: 26, fontWeight: '600' }}>Stay in the loop</Text>
      <Text style={{ color: C.muted, fontSize: 15, lineHeight: 23, marginTop: 12, marginBottom: 24 }}>{role === 'worker' ? 'Get shift changes and reminders, even when Tempo is closed.' : 'Enable notifications on this device. You can change permissions in device settings.'}</Text>
      {!!message && <Text accessibilityRole="alert" style={{ color: C.muted, lineHeight: 20, marginBottom: 16 }}>{message}</Text>}
      <View style={{ gap: 12 }}><Button label={busy ? 'Enabling…' : 'Enable notifications'} disabled={busy} onPress={() => void enable()} /><Button label="Not now" variant="outline" disabled={busy} onPress={() => void finish()} />{!!message && <Button label="Open device settings" variant="outline" onPress={() => void Linking.openSettings()} />}</View>
    </Card></View>
  </Modal>;
}

export function NotificationPermissionsButton() {
  const C = useTheme().colors;
  const { role, online } = useStore();
  const { setReminders } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  if (Platform.OS === 'web' || !Notifications.available) return null;
  const enable = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      if (!await requestReminderPermission()) { setMessage('Notifications are off. You can enable them in your device settings.'); return; }
      if (role === 'worker') await setReminders(true);
      if (online) await registerPushDevice();
      setMessage('Notifications enabled.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not enable notifications. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={{ marginTop: 20, gap: 12 }}><Button label={busy ? 'Enabling…' : 'Enable notifications'} variant="outline" disabled={busy} onPress={() => void enable()} />{!!message && <><Text accessibilityLiveRegion="polite" style={{ color: C.muted, lineHeight: 20 }}>{message}</Text><Button label="Open device settings" small variant="outline" onPress={() => void Linking.openSettings()} /></>}</View>;
}
