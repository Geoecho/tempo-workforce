import { router } from 'expo-router';
import { Bell, CalendarDays, LogIn, X } from 'lucide-react-native';
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
  return <Screen back title="Notifications" subtitle={role === 'admin' ? 'See when your team clocks in to a shift.' : 'Changes to your assigned shifts appear here.'}>
    {!!error && <Text accessibilityRole="alert" style={{ color: C.red, marginBottom: 12 }}>{error}</Text>}
    {ordered.length ? ordered.map(item => <View key={item.id} style={{ marginBottom: 9 }}>
      <Card style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderColor: item.readAt ? C.line : C.green, backgroundColor: item.readAt ? C.surface : C.mint }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.body}`} onPress={() => void open(item.id, item.shiftId)} style={{ flex: 1, minWidth: 0, flexDirection: 'row', gap: 12, padding: 4 }}>
          <View style={{ width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.mint }}>{item.kind === 'clocked-in' ? <LogIn size={18} color={C.green} /> : item.kind === 'removed' ? <Bell size={18} color={C.green} /> : <CalendarDays size={18} color={C.green} />}</View>
          <View style={{ flex: 1 }}><Text style={{ color: C.ink, fontWeight: item.readAt ? '500' : '700', fontSize: 14 }}>{item.title}</Text><Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{item.body}</Text><Text style={{ color: C.muted, fontSize: 11, marginTop: 7 }}>{new Date(item.createdAt).toLocaleString()}</Text></View>
          {!item.readAt && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.green, marginTop: 6 }} />}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove notification: ${item.title}`} disabled={pending.includes(item.id)} onPress={() => void dismiss(item.id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, opacity: pending.includes(item.id) ? .4 : 1 }}><X size={19} color={C.muted} /></Pressable>
      </Card>
    </View>) : <Empty title="All caught up" detail={role === 'admin' ? 'Worker clock-ins will appear here when attendance syncs.' : 'Updates to your assigned shifts will appear here.'} />}
  </Screen>;
}
