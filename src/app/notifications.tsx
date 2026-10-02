import { router } from 'expo-router';
import { Bell, CalendarDays, CheckCheck, LogIn, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { useStore } from '../lib/store';
import { Card, Empty, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function Notifications() {
  const C = useTheme().colors;
  const { notifications, markNotificationRead, dismissNotification, shifts, role } = useStore();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string[]>([]);
  const ordered = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const open = async (id: string, shiftId: string) => {
    try {
      setError('');
      await markNotificationRead(id);
      if (shifts.some(shift => shift.id === shiftId && !shift.archived)) router.push(`/shift/${shiftId}` as never);
    } catch { setError('Could not open this notification. Please try again.'); }
  };
  const dismiss = async (id: string) => {
    setError('');
    setPending(current => [...current, id]);
    try { await dismissNotification(id); }
    catch { setError('Could not remove this notification. Please try again.'); }
    finally { setPending(current => current.filter(item => item !== id)); }
  };
  const unread = ordered.filter(item => !item.readAt).length;
  const filtered = ordered.filter(item => !unreadOnly || !item.readAt);
  const groups = new Map<string, typeof ordered>();
  const today = new Date().toDateString();
  for (const item of filtered) {
    const date = new Date(item.createdAt);
    const label = date.toDateString() === today ? 'Today' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  const readAll = async () => {
    if (marking) return;
    setMarking(true); setError('');
    try { await Promise.all(ordered.filter(item => !item.readAt).map(item => markNotificationRead(item.id))); }
    catch { setError('Some updates could not be marked as read. Please try again.'); }
    finally { setMarking(false); }
  };
  return <Screen back title="Notifications" subtitle={role === 'admin' ? 'Your team activity, in one place.' : 'Your latest shift updates.'}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', gap: 4, padding: 4, backgroundColor: C.subtle, borderRadius: 12 }}>
        {[false, true].map(value => <Pressable key={String(value)} accessibilityRole="tab" accessibilityState={{ selected: unreadOnly === value }} onPress={() => setUnreadOnly(value)} style={{ minHeight: 40, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 9, backgroundColor: unreadOnly === value ? C.surface : 'transparent' }}><Text style={{ color: unreadOnly === value ? C.ink : C.muted, fontWeight: '500', fontSize: 13 }}>{value ? `Unread (${unread})` : 'All activity'}</Text></Pressable>)}
      </View>
      {unread > 0 && <Pressable accessibilityRole="button" disabled={marking} onPress={() => void readAll()} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, opacity: marking ? .5 : 1 }}><CheckCheck size={17} color={C.green} /><Text style={{ color: C.green, fontSize: 12, fontWeight: '500' }}>{marking ? 'Updating...' : 'Mark all read'}</Text></Pressable>}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: C.red, marginBottom: 12 }}>{error}</Text>}
    {filtered.length ? [...groups].map(([day, items]) => <View key={day} style={{ marginBottom: 24 }}>
      <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600', marginBottom: 10 }}>{day}</Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {items.map((item, index) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: index ? 1 : 0, borderTopColor: C.line }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.body}`} onPress={() => void open(item.id, item.shiftId)} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>{item.kind === 'clocked-in' ? <LogIn size={18} color={C.green} /> : item.kind === 'removed' ? <Bell size={18} color={C.muted} /> : <CalendarDays size={18} color={C.green} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: item.readAt ? '400' : '600', fontSize: 14, lineHeight: 20 }}>{item.title}</Text>
              <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 3 }}>{item.body}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 }}><Text style={{ color: C.muted, fontSize: 11 }}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>{!item.readAt && <Text style={{ color: C.green, fontSize: 11, fontWeight: '500' }}>New</Text>}</View>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove notification: ${item.title}`} disabled={pending.includes(item.id)} onPress={() => void dismiss(item.id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pending.includes(item.id) ? .4 : 1 }}><X size={17} color={C.muted} /></Pressable>
        </View>)}
      </Card>
    </View>) : <Empty title={unreadOnly ? 'Everything is read' : 'All caught up'} detail={unreadOnly ? 'Switch to All activity to see your previous updates.' : 'New updates will appear here.'} />}
  </Screen>;
}
