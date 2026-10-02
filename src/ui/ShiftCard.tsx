import { router } from 'expo-router';
import { ArrowUpRight, MapPin, UsersRound } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, View } from 'react-native';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { durationMinutes, formatDay, hoursLabel, Shift } from '../lib/data';
import { useExtras } from '../lib/extras';
import { useStore } from '../lib/store';
import { RoleChips } from './extras-ui';
import { Card } from './components';
import { useTheme } from './theme';

export function ShiftCard({ shift, compact = false, history = false }: { shift: Shift; compact?: boolean; history?: boolean }) {
  const C = useTheme().colors;
  const { workers, punches, role, selectedWorkerId, currency } = useStore();
  const { assignment } = useExtras();
  const myRoles = role === 'worker' && shift.workerIds.includes(selectedWorkerId) ? assignment(shift.id, selectedWorkerId).roles : [];
  const checkedIn = [...new Set(punches.filter(p => p.shiftId === shift.id && p.type === 'in').map(p => p.workerId))].length;
  const recordedMinutes = [...new Set(punches.filter(p => p.shiftId === shift.id).map(p => p.workerId))].reduce((total, workerId) => total + durationMinutes(punches, shift.id, workerId), 0);
  const [scale] = useState(() => new Animated.Value(1));
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {}); }, []);
  const pressScale = (value: number) => {
    if (reducedMotion) return;
    Animated.spring(scale, { toValue: value, speed: 30, bounciness: 5, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  return <Animated.View style={{ marginBottom: 10, transform: [{ scale }] }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${shift.title} shift`}
      onPress={() => router.push({ pathname: '/shift/[id]', params: { id: shift.id } })}
      onPressIn={() => pressScale(.985)}
      onPressOut={() => pressScale(1)}
      style={({ pressed }) => pressed && { opacity: .94 }}
    >
      <Card style={{ padding: compact ? 19 : 23 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.muted, fontSize: 14 }}>{formatDay(shift.date)}  ·  {shift.start}–{shift.end}</Text>
            <Text style={{ color: C.ink, fontSize: compact ? 18 : 20, fontWeight: '400', marginTop: 9, letterSpacing: -.4 }}>{shift.title}</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginTop: 3 }}>{shift.site}</Text>
            {history && <Text style={{ color: C.green, fontSize: 14, fontWeight: '500', marginTop: 7 }}>{shift.archived ? 'REMOVED · ' : ''}{checkedIn} checked in · {hoursLabel(recordedMinutes)} recorded</Text>}
          </View>
          <ArrowUpRight size={18} color={C.muted} />
        </View>
        {!!myRoles.length && <View style={{ marginTop: 11 }}><RoleChips roles={myRoles} currency={currency} /></View>}
        <View style={{ height: 1, backgroundColor: C.line, marginVertical: 15 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 12 }}><MapPin size={13} color={C.muted} /><Text style={{ flex: 1, color: C.muted, fontSize: 14 }}>{shift.location}</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><UsersRound size={13} color={C.muted} /><Text style={{ color: C.muted, fontSize: 14 }}>{shift.workerIds.filter(id => workers.some(worker => worker.id === id)).length}</Text></View>
        </View>
      </Card>
    </Pressable>
  </Animated.View>;
}
