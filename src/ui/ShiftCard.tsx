import { router } from 'expo-router';
import { ArrowUpRight, MapPin, UsersRound } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, Text, View } from 'react-native';
import { formatDay, Shift } from '../lib/data';
import { useStore } from '../lib/store';
import { Card } from './components';
import { C } from './theme';

export function ShiftCard({ shift, compact = false }: { shift: Shift; compact?: boolean }) {
  const { workers } = useStore();
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
      <Card style={{ padding: compact ? 16 : 19 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>{formatDay(shift.date).toUpperCase()}  ·  {shift.start}–{shift.end}</Text>
            <Text style={{ color: C.ink, fontSize: compact ? 16 : 17, fontWeight: '700', marginTop: 7, letterSpacing: -.2 }}>{shift.title}</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>{shift.site}</Text>
          </View>
          <ArrowUpRight size={18} color={C.muted} />
        </View>
        <View style={{ height: 1, backgroundColor: C.line, marginVertical: 15 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><MapPin size={13} color={C.muted} /><Text style={{ color: C.muted, fontSize: 12 }}>{shift.location}</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><UsersRound size={13} color={C.muted} /><Text style={{ color: C.muted, fontSize: 12 }}>{shift.workerIds.filter(id => workers.some(worker => worker.id === id)).length}</Text></View>
        </View>
      </Card>
    </Pressable>
  </Animated.View>;
}
