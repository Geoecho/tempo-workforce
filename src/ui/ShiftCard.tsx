import { router } from 'expo-router';
import { ChevronRight, MapPin, UsersRound } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, View } from 'react-native';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { durationMinutes, formatDay, hoursLabel, shiftHasEnded, Shift } from '../lib/data';
import { useExtras } from '../lib/extras';
import { useStore } from '../lib/store';
import { RoleChips } from './extras-ui';
import { Card, SelectionMark } from './components';
import { useTheme } from './theme';

export function ShiftCard({ shift, compact = false, history = false, hideDate = false, now: suppliedNow, layout = 'grid', selection }: { shift: Shift; compact?: boolean; history?: boolean; hideDate?: boolean; now?: number; layout?: 'grid' | 'list'; selection?: { selected: boolean; disabled: boolean; onToggle: () => void } }) {
  const [mountedAt] = useState(Date.now);
  const now = suppliedNow ?? mountedAt;
  const C = useTheme().colors;
  const { workers, punches, role, selectedWorkerId, currency } = useStore();
  const { assignment } = useExtras();
  const myRoles = role === 'worker' && shift.workerIds.includes(selectedWorkerId) ? assignment(shift.id, selectedWorkerId).roles : [];
  const shiftPunches = punches.filter(p => p.shiftId === shift.id && (role === 'admin' || p.workerId === selectedWorkerId));
  const latest = new Map<string, typeof punches[number]>();
  for (const punch of shiftPunches) {
    if (!latest.has(punch.workerId) || punch.at >= latest.get(punch.workerId)!.at) latest.set(punch.workerId, punch);
  }
  const onSite = [...latest.values()].filter(p => p.type === 'in').length;
  const checkedIn = [...new Set(shiftPunches.filter(p => p.type === 'in').map(p => p.workerId))].length;
  const recordedMinutes = history ? [...latest.keys()].reduce((total, workerId) => total + durationMinutes(punches, shift.id, workerId), 0) : 0;
  const assigned = shift.workerIds.filter(id => workers.some(worker => worker.id === id && !worker.archived));
  const ended = shiftHasEnded(shift, now);
  const started = new Date(`${shift.date}T${shift.start}:00`).getTime() <= now;
  const status = shift.archived ? 'Removed' : onSite ? ended ? 'Check-out pending' : role === 'worker' ? 'On shift' : 'On site' : ended ? 'Completed' : role === 'admin' && !assigned.length ? 'Unassigned' : started ? 'In progress' : 'Upcoming';
  const warning = status === 'Unassigned' || status === 'Check-out pending';
  const live = onSite > 0 || (!ended && started);
  const tone = warning ? C.warningText : live ? C.green : C.muted;
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const duration = minutes(shift.end) - minutes(shift.start);
  const scheduledHours = hoursLabel(duration <= 0 ? duration + 1440 : duration);
  const [pressOffset] = useState(() => new Animated.Value(0));
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {}); }, []);
  const pressScale = (value: number) => {
    if (reducedMotion) return;
    Animated.spring(pressOffset, { toValue: value, speed: 30, bounciness: 5, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  return <Animated.View style={{ marginBottom: 4, transform: [{ translateY: pressOffset }] }}>
    <Pressable
      accessibilityRole={selection ? 'checkbox' : 'button'}
      accessibilityState={selection ? { checked: selection.selected, disabled: selection.disabled } : undefined}
      disabled={selection?.disabled}
      accessibilityLabel={`${shift.title}, ${formatDay(shift.date)}, ${shift.start} to ${shift.end}, ${shift.site}, ${status}. ${selection ? selection.disabled ? 'Cannot remove this shift' : 'Select shift' : 'Open shift details'}`}
      onPress={() => selection ? selection.onToggle() : router.push({ pathname: '/shift/[id]', params: { id: shift.id } })}
      onPressIn={() => pressScale(1)}
      onPressOut={() => pressScale(0)}
      style={({ pressed }) => pressed && { opacity: .94 }}
    >
      <Card style={{ padding: compact ? 16 : 20, borderColor: selection?.selected ? C.green : C.line, backgroundColor: selection?.selected ? C.mint : C.surface, opacity: selection?.disabled ? .6 : 1 }}>
        {role === 'admin' && !ended && assigned.length < (shift.requiredWorkers ?? 0) && <Text style={{ color: C.warningText, fontSize: 13, marginBottom: 12 }}>{(shift.requiredWorkers ?? 0) - assigned.length} <Text>more people needed</Text></Text>}
        {layout === 'list' ? <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {selection && <SelectionMark selected={selection.selected} />}
            <View style={{ minWidth: 74 }}><Text style={{ fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{shift.start}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{shift.end}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={{ fontSize: 16, fontWeight: '600' }}>{shift.title}</Text><Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{shift.site}{shift.location ? ` · ${shift.location}` : ''}</Text></View>
            {!selection && <ChevronRight size={16} color={C.muted} />}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9 }}>
            {!hideDate && <Text style={{ color: C.muted, fontSize: 12 }}>{formatDay(shift.date)}</Text>}
            <Text style={{ color: C.muted, fontSize: 12 }}>{scheduledHours} <Text>scheduled</Text></Text>
            <UsersRound size={13} color={C.muted} /><Text style={{ color: C.muted, fontSize: 12 }}>{assigned.length} <Text>assigned</Text></Text>
            <Text style={{ marginLeft: 'auto', color: tone, fontSize: 12, fontWeight: '500' }}>{selection?.disabled ? shift.archived ? 'Already removed' : 'Active check-in · cannot remove' : status}</Text>
          </View>
        </View> : <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
          {selection && <SelectionMark selected={selection.selected} />}
          <Text style={{ flex: 1, color: C.muted, fontSize: 12 }}>{!hideDate && `${formatDay(shift.date)} · `}{scheduledHours} <Text>scheduled</Text></Text>
          <View style={{ backgroundColor: warning ? C.orange : live ? C.mint : C.subtle, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7 }}><Text style={{ color: tone, fontSize: 11, fontWeight: '600' }}>{status}</Text></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <View style={{ minWidth: 61, paddingRight: 12, borderRightWidth: 1, borderRightColor: C.line }}>
            <Text style={{ color: C.ink, fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{shift.start}</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 6, fontVariant: ['tabular-nums'] }}>{shift.end}</Text>
            {shift.end <= shift.start && <Text style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>Next day</Text>}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.ink, fontSize: compact ? 17 : 19, fontWeight: '600', letterSpacing: -.3 }}>{shift.title}</Text>
            <Text style={{ color: C.green, fontSize: 13, marginTop: 5, fontWeight: '500' }}>{shift.site}</Text>
            {!!shift.location && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}><MapPin size={12} color={C.muted} /><Text style={{ flex: 1, color: C.muted, fontSize: 12 }}>{shift.location}</Text></View>}
          </View>
          {!selection && <ChevronRight size={16} color={C.muted} style={{ alignSelf: 'center' }} />}
        </View>
        {selection?.disabled && <Text style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>{shift.archived ? 'Already removed' : 'Active check-in · cannot remove'}</Text>}
        {!!myRoles.length && <View style={{ marginTop: 13 }}><RoleChips roles={myRoles} currency={currency} /></View>}
        <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12, marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {history ? <Text style={{ color: C.muted, fontSize: 12 }}>{role === 'admin' ? `${checkedIn} checked in · ` : ''}{hoursLabel(recordedMinutes)} recorded</Text> : role === 'admin' ? <><UsersRound size={14} color={warning ? C.warningText : C.muted} /><Text style={{ color: warning ? C.warningText : C.muted, fontSize: 12 }}>{assigned.length ? `${assigned.length} assigned` : 'Assign your team'}</Text>{onSite > 0 && <Text style={{ color: C.green, fontSize: 12 }}>· {onSite} on site</Text>}</> : <Text style={{ color: C.muted, fontSize: 12 }}>{ended && onSite ? 'Scan the site code to check out' : 'Tap for shift details'}</Text>}
          {!!shift.team && <Text style={{ marginLeft: 'auto', color: C.muted, fontSize: 12 }}>{shift.team}</Text>}
        </View>
        </>}
      </Card>
    </Pressable>
  </Animated.View>;
}
