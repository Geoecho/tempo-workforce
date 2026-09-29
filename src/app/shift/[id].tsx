import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Clock3, MapPin, Phone, QrCode } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { durationMinutes, formatDay, formatMoney, hoursLabel } from '../../lib/data';
import { callWorker } from '../../lib/phone';
import { useStore } from '../../lib/store';
import { Avatar, Button, Card, Pill, Screen, Section } from '../../ui/components';
import { C } from '../../ui/theme';

export default function ShiftDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shifts, workers, punches, role, currency } = useStore();
  const shift = shifts.find(s => s.id === id);
  if (!shift) return <Screen title="Shift not found" back><Text>This shift may have been removed.</Text></Screen>;
  return <Screen back>
    <Pill tone={shift.status === 'active' ? 'green' : 'gray'}>{shift.status.toUpperCase()}</Pill>
    <Text style={{ fontSize: 29, fontWeight: '700', color: C.ink, marginTop: 14, letterSpacing: -.7 }}>{shift.title}</Text><Text style={{ color: C.muted, fontSize: 15, marginTop: 5 }}>{shift.site}</Text>
    <Card style={{ marginTop: 25 }}><View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}><CalendarDays size={18} color={C.green} /><Text style={{ color: C.ink, fontWeight: '600', marginLeft: 12 }}>{formatDay(shift.date)}</Text></View><View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}><Clock3 size={18} color={C.green} /><Text style={{ color: C.ink, fontWeight: '600', marginLeft: 12 }}>{shift.start} – {shift.end}</Text></View><View style={{ flexDirection: 'row', alignItems: 'center' }}><MapPin size={18} color={C.green} /><Text style={{ color: C.ink, fontWeight: '600', marginLeft: 12 }}>{shift.location}</Text></View></Card>
    {role === 'admin' ? <View style={{ marginTop: 13 }}><Button label="Display site QR code" icon={<QrCode size={18} color="#fff" />} onPress={() => router.push({ pathname: '/pass', params: { shiftId: shift.id } })} /></View> : <View style={{ marginTop: 13 }}><Button label="Scan to clock in or out" icon={<QrCode size={18} color="#fff" />} onPress={() => router.push('/scan')} /></View>}
    <Section title="Assigned team" />
    <Card style={{ padding: 0, overflow: 'hidden' }}>{shift.workerIds.map((workerId, i) => { const w = workers.find(x => x.id === workerId); if (!w) return null; const last = [...punches].reverse().find(p => p.shiftId === shift.id && p.workerId === workerId); return <View key={workerId} style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}><Avatar worker={w} size={38} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{w.name}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{w.role} · {hoursLabel(durationMinutes(punches, shift.id, workerId))}</Text>{role === 'admin' && <Text style={{ color: C.green, fontSize: 11, marginTop: 3 }}>{formatMoney(Math.round(w.hourlyRate * 100), currency)}/h</Text>}</View>{role === 'admin' && w.phone ? <Pressable accessibilityLabel={`Call ${w.name}`} onPress={() => callWorker(w.phone)} style={{ width: 36, height: 36, backgroundColor: C.mint, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}><Phone size={17} color={C.green} /></Pressable> : <Pill tone={last?.type === 'in' ? 'green' : 'gray'}>{last?.type === 'in' ? 'ON SITE' : 'ASSIGNED'}</Pill>}</View>; })}</Card>
  </Screen>;
}
