import { router } from 'expo-router';
import { Bell, CalendarDays } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { useStore } from '../lib/store';
import { Card, Empty, Screen } from '../ui/components';
import { C } from '../ui/theme';

export default function Notifications() {
  const { notifications, markNotificationRead, shifts } = useStore();
  const ordered = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const open = async (id: string, shiftId: string) => {
    await markNotificationRead(id);
    if (shifts.some(shift => shift.id === shiftId && !shift.archived)) router.push(`/shift/${shiftId}` as never);
  };
  return <Screen back title="Notifications" subtitle="Changes to your assigned shifts appear here.">
    {ordered.length ? ordered.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => void open(item.id, item.shiftId)} style={{ marginBottom: 9 }}>
      <Card style={{ flexDirection: 'row', gap: 12, borderColor: item.readAt ? C.line : C.green, backgroundColor: item.readAt ? C.surface : '#F2FAF4' }}>
        <View style={{ width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.mint }}>{item.kind === 'removed' ? <Bell size={18} color={C.green} /> : <CalendarDays size={18} color={C.green} />}</View>
        <View style={{ flex: 1 }}><Text style={{ color: C.ink, fontWeight: item.readAt ? '600' : '800', fontSize: 14 }}>{item.title}</Text><Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{item.body}</Text><Text style={{ color: C.muted, fontSize: 11, marginTop: 7 }}>{new Date(item.createdAt).toLocaleString()}</Text></View>
        {!item.readAt && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.green }} />}
      </Card>
    </Pressable>) : <Empty title="All caught up" detail="When an admin changes one of your shifts, the update will appear here." />}
  </Screen>;
}
