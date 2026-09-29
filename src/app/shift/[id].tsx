import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, CalendarPlus, Clock3, MapPin, Pencil, Phone, QrCode, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { addShiftToCalendar } from '../../lib/calendar';
import { durationMinutes, formatDay, formatMoney, hoursLabel } from '../../lib/data';
import { confirmRemoval } from '../../lib/confirm';
import { callWorker } from '../../lib/phone';
import { useStore } from '../../lib/store';
import { Avatar, Button, Card, Pill, Screen, Section } from '../../ui/components';
import { C } from '../../ui/theme';

export default function ShiftDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shifts, workers, punches, role, currency, removeShift } = useStore();
  const shift = shifts.find(s => s.id === id);
  if (!shift || shift.archived) return <Screen title="Shift not found" back><Text>This shift may have been removed.</Text></Screen>;
  const hasHistory = punches.some(p => p.shiftId === id);
  const onSite = workers.some(w => [...punches].reverse().find(p => p.shiftId === id && p.workerId === w.id)?.type === 'in');
  const remove = () => {
    if (onSite) return;
    confirmRemoval('Remove shift?', hasHistory ? 'This shift will leave the schedule. Its clock and pay history will remain.' : 'This shift will be removed from the schedule.', () => { removeShift(shift.id); router.replace('/schedule'); });
  };
  return <Screen back>
    <Pill tone={shift.status === 'active' ? 'green' : 'gray'}>{shift.status.toUpperCase()}</Pill>
    <Text style={{ fontSize: 29, fontWeight: '700', color: C.ink, marginTop: 14, letterSpacing: -.7 }}>{shift.title}</Text><Text style={{ color: C.muted, fontSize: 15, marginTop: 5 }}>{shift.site}</Text>
    <Card style={{ marginTop: 25 }}><View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}><CalendarDays size={18} color={C.green} /><Text style={{ color: C.ink, fontWeight: '600', marginLeft: 12 }}>{formatDay(shift.date)}</Text></View><View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}><Clock3 size={18} color={C.green} /><Text style={{ color: C.ink, fontWeight: '600', marginLeft: 12 }}>{shift.start} – {shift.end}</Text></View><View style={{ flexDirection: 'row', alignItems: 'center' }}><MapPin size={18} color={C.green} /><Text style={{ color: C.ink, fontWeight: '600', marginLeft: 12 }}>{shift.location}</Text></View></Card>
    <View style={{ marginTop: 11 }}><Button label="Add to calendar" variant="outline" icon={<CalendarPlus size={17} color={C.green} />} onPress={() => void addShiftToCalendar(shift).catch(error => Alert.alert('Calendar unavailable', error instanceof Error ? error.message : 'Could not share this shift.'))} /></View>
    {role === 'admin' ? <View style={{ marginTop: 13 }}><Button label="Display site QR code" icon={<QrCode size={18} color="#fff" />} onPress={() => router.push({ pathname: '/pass', params: { shiftId: shift.id } })} /></View> : <View style={{ marginTop: 13 }}><Button label="Scan to clock in or out" icon={<QrCode size={18} color="#fff" />} onPress={() => router.push('/scan')} /></View>}
    {role === 'admin' && <View style={{ flexDirection: 'row', gap: 9, marginTop: 10 }}><View style={{ flex: 1 }}><Pressable accessibilityRole="button" onPress={() => router.push(`/edit-shift/${shift.id}` as never)} style={({ pressed }) => ({ minHeight: 48, borderRadius: 13, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? .7 : 1 })}><Pencil size={16} color={C.green} /><Text style={{ color: C.green, fontWeight: '700', fontSize: 14 }}>Edit shift</Text></Pressable></View><View style={{ flex: 1 }}><Button label="Remove" variant="danger" icon={<Trash2 size={16} color={C.red} />} onPress={remove} /></View></View>}
    {role === 'admin' && onSite && <Text style={{ color: C.muted, fontSize: 11, marginTop: 7 }}>Check out everyone on site before removing this shift.</Text>}
    <Section title="Assigned team" />
    <Card style={{ padding: 0, overflow: 'hidden' }}>{shift.workerIds.map((workerId, i) => { const w = workers.find(x => x.id === workerId); if (!w) return null; const last = [...punches].reverse().find(p => p.shiftId === shift.id && p.workerId === workerId); return <View key={workerId} style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}><Avatar worker={w} size={38} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{w.name}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{w.role} · {hoursLabel(durationMinutes(punches, shift.id, workerId))}</Text>{role === 'admin' && <Text style={{ color: C.green, fontSize: 11, marginTop: 3 }}>{formatMoney(Math.round(w.hourlyRate * 100), currency)}/h</Text>}</View>{role === 'admin' && w.phone ? <Pressable accessibilityLabel={`Call ${w.name}`} onPress={() => callWorker(w.phone)} style={{ width: 36, height: 36, backgroundColor: C.mint, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}><Phone size={17} color={C.green} /></Pressable> : <Pill tone={last?.type === 'in' ? 'green' : 'gray'}>{last?.type === 'in' ? 'ON SITE' : 'ASSIGNED'}</Pill>}</View>; })}</Card>
  </Screen>;
}
