import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Clock3, MapPin, Pencil, Phone, QrCode, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { durationMinutes, formatDay, formatMoney, formatTime, hoursLabel, localDate, shiftHasEnded, today } from '../../lib/data';
import { confirmRemoval } from '../../lib/confirm';
import { callWorker } from '../../lib/phone';
import { useStore } from '../../lib/store';
import { CalendarAction } from '../../ui/CalendarAction';
import { Avatar, Button, Card, Pill, Screen, Section } from '../../ui/components';
import { C } from '../../ui/theme';

export default function ShiftDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shifts, workers, punches, role, currency, removeShift } = useStore();
  const shift = shifts.find(s => s.id === id);
  if (!shift) return <Screen title="Shift not found" back><Text>This shift may have been removed.</Text></Screen>;
  const hasHistory = punches.some(p => p.shiftId === id);
  if (shift.archived && !hasHistory) return <Screen title="Shift not found" back><Text>This shift may have been removed.</Text></Screen>;
  const ended = shiftHasEnded(shift);
  const canScan = !shift.archived && shift.date === today();
  const teamIds = [...new Set([...shift.workerIds, ...punches.filter(p => p.shiftId === id).map(p => p.workerId)])];
  const clockHistory = punches.filter(p => p.shiftId === id).sort((a, b) => b.at.localeCompare(a.at));
  const lastByWorker = new Map<string, typeof punches[number]>();
  for (const punch of clockHistory.slice().reverse()) lastByWorker.set(punch.workerId, punch);
  const openCount = teamIds.filter(workerId => lastByWorker.get(workerId)?.type === 'in').length;
  const onSiteCount = canScan ? openCount : 0;
  const checkedOutCount = teamIds.filter(workerId => lastByWorker.get(workerId)?.type === 'out').length;
  const onSite = onSiteCount > 0;
  const remove = () => {
    if (openCount) return;
    confirmRemoval('Remove shift?', hasHistory ? 'This shift will leave the schedule. Its clock and pay history will remain.' : 'This shift will be removed from the schedule.', () => { removeShift(shift.id); router.replace('/schedule'); });
  };
  return <Screen back>
    <Pill tone={shift.archived || (ended && !onSite) ? 'gray' : 'green'}>{shift.archived ? 'ARCHIVED' : onSite ? 'ACTIVE' : ended ? 'FINISHED' : shift.status.toUpperCase()}</Pill>
    <Text style={{ fontSize: 29, fontWeight: '700', color: C.ink, marginTop: 14, letterSpacing: -.7 }}>{shift.title}</Text><Text style={{ color: C.muted, fontSize: 15, marginTop: 5 }}>{shift.site}</Text>
    <Card style={{ marginTop: 25 }}><View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}><CalendarDays size={18} color={C.green} /><Text style={{ color: C.ink, fontWeight: '600', marginLeft: 12 }}>{formatDay(shift.date)}</Text></View><View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}><Clock3 size={18} color={C.green} /><Text style={{ color: C.ink, fontWeight: '600', marginLeft: 12 }}>{shift.start} – {shift.end}</Text></View><View style={{ flexDirection: 'row', alignItems: 'center' }}><MapPin size={18} color={C.green} /><Text style={{ color: C.ink, fontWeight: '600', marginLeft: 12 }}>{shift.location}</Text></View></Card>
    {!ended && !shift.archived && <CalendarAction shift={shift} />}
    {canScan && (role === 'admin' ? <View style={{ marginTop: 13 }}><Button label="Display site QR code" icon={<QrCode size={18} color="#fff" />} onPress={() => router.push({ pathname: '/pass', params: { shiftId: shift.id } })} /></View> : <View style={{ marginTop: 13 }}><Button label="Scan to clock in or out" icon={<QrCode size={18} color="#fff" />} onPress={() => router.push('/scan')} /></View>)}
    {role === 'admin' && !shift.archived && <View style={{ flexDirection: 'row', gap: 9, marginTop: 10 }}><View style={{ flex: 1 }}><Pressable accessibilityRole="button" onPress={() => router.push(`/edit-shift/${shift.id}` as never)} style={({ pressed }) => ({ minHeight: 48, borderRadius: 13, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? .7 : 1 })}><Pencil size={16} color={C.green} /><Text style={{ color: C.green, fontWeight: '700', fontSize: 14 }}>Edit shift</Text></Pressable></View>{openCount === 0 && <View style={{ flex: 1 }}><Button label="Remove" variant="danger" icon={<Trash2 size={16} color={C.red} />} onPress={remove} /></View>}</View>}
    {role === 'admin' && openCount > 0 && <Text style={{ color: C.muted, fontSize: 11, marginTop: 7 }}>{canScan ? 'Check out everyone on site before removing this shift.' : 'A check-out is missing from this shift. Resolve the time record before removal.'}</Text>}
    <Section title="Assigned team" />
    {role === 'admin' && <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}><Card style={{ flex: 1, padding: 13 }}><Text style={{ color: C.green, fontSize: 23, fontWeight: '800' }}>{canScan ? onSiteCount : openCount}</Text><Text style={{ color: C.muted, fontSize: 11 }}>{canScan ? 'On site' : 'No check-out'}</Text></Card><Card style={{ flex: 1, padding: 13 }}><Text style={{ color: C.ink, fontSize: 23, fontWeight: '800' }}>{teamIds.length - openCount - checkedOutCount}</Text><Text style={{ color: C.muted, fontSize: 11 }}>Not arrived</Text></Card><Card style={{ flex: 1, padding: 13 }}><Text style={{ color: C.ink, fontSize: 23, fontWeight: '800' }}>{checkedOutCount}</Text><Text style={{ color: C.muted, fontSize: 11 }}>Checked out</Text></Card></View>}
    <Card style={{ padding: 0, overflow: 'hidden' }}>{teamIds.map((workerId, i) => { const w = workers.find(x => x.id === workerId); if (!w) return null; const last = lastByWorker.get(workerId); return <View key={workerId} style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}><Avatar worker={w} size={38} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{w.name}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{w.role} · {hoursLabel(durationMinutes(punches, shift.id, workerId))}</Text>{last && <Text style={{ color: last.type === 'in' ? C.green : C.muted, fontSize: 11, marginTop: 3 }}>{last.type === 'in' ? 'Checked in' : 'Checked out'} at {formatTime(last.at)}</Text>}{role === 'admin' && <Text style={{ color: C.green, fontSize: 11, marginTop: 3 }}>{formatMoney(Math.round(w.hourlyRate * 100), currency)}/h</Text>}</View><View style={{ alignItems: 'flex-end', gap: 6 }}><Pill tone={last?.type === 'in' ? 'green' : 'gray'}>{last?.type === 'in' ? 'ON SITE' : last?.type === 'out' ? 'CHECKED OUT' : 'NOT ARRIVED'}</Pill>{role === 'admin' && w.phone && <Pressable accessibilityLabel={`Call ${w.name}`} onPress={() => callWorker(w.phone)} style={{ width: 31, height: 31, backgroundColor: C.mint, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}><Phone size={15} color={C.green} /></Pressable>}</View></View>; })}</Card>
    {!!clockHistory.length && <><Section title="Clock history" /><Card style={{ padding: 0, overflow: 'hidden' }}>{clockHistory.map((punch, i) => { const worker = workers.find(w => w.id === punch.workerId); return <View key={punch.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: punch.type === 'in' ? C.green : C.muted, marginRight: 12 }} /><View style={{ flex: 1 }}><Text style={{ color: C.ink, fontSize: 12, fontWeight: '700' }}>{worker?.name ?? 'Team member'} checked {punch.type}</Text><Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{formatDay(punch.workDate ?? localDate(new Date(punch.at)))}</Text></View><Text style={{ color: C.muted, fontSize: 12 }}>{formatTime(punch.at)}</Text></View>; })}</Card></>}
  </Screen>;
}
