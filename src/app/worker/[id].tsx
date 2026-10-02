import { router, useLocalSearchParams } from 'expo-router';
import { MessageSquare, Phone, Trash2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../../ui/LocalizedPressable';
import { Text } from '../../ui/LocalizedText';
import { formatDay, formatMoney, formatTime, hoursLabel, localDate, paySummary, today, Worker } from '../../lib/data';
import { confirmRemoval } from '../../lib/confirm';
import { callWorker, messageWorker } from '../../lib/phone';
import { useExtras } from '../../lib/extras';
import { useStore } from '../../lib/store';
import { RolePicker, TaskList } from '../../ui/extras-ui';
import { chooseProfilePhoto } from '../../lib/profile-photo';
import { Avatar, Button, Card, Screen, Section } from '../../ui/components';
import { Field } from '../../ui/Field';
import { useTheme } from '../../ui/theme';

export default function WorkerDetail() {
  const C = useTheme().colors;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workers, ready, role } = useStore();
  const worker = workers.find(w => w.id === id);
  if (!ready) return <Screen back title="Loading worker"><Text style={{ color: C.muted }}>Loading profile…</Text></Screen>;
  if (!worker || role !== 'admin') return <Screen back title="Profile unavailable"><Text style={{ color: C.muted }}>This worker profile is not available.</Text></Screen>;
  return <WorkerEditor key={worker.id} worker={worker} />;
}

function WorkerEditor({ worker }: { worker: Worker }) {
  const C = useTheme().colors;
  const { updateWorker, removeWorker, currency, punches, shifts } = useStore();
  const { workerRoles, setWorkerRoles } = useExtras();
  const [name, setName] = useState(worker.name);
  const [job, setJob] = useState(worker.role);
  const [team, setTeam] = useState(worker.team);
  const [phone, setPhone] = useState(worker.phone ?? '');
  const [rate, setRate] = useState(String(worker.hourlyRate));
  const [photoUri, setPhotoUri] = useState(worker.photoUri);
  const [message, setMessage] = useState('');
  const save = () => {
    const hourlyRate = Number(rate.replace(',', '.'));
    if (!name.trim() || !job.trim() || !team.trim()) return setMessage('Name, job title, and team are required.');
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0 || hourlyRate > 10_000) return setMessage('Enter a valid hourly rate above zero.');
    updateWorker(worker.id, { name: name.trim(), role: job.trim(), team: team.trim(), phone: phone.trim(), photoUri, hourlyRate: Math.round(hourlyRate * 100) / 100 });
    router.back();
  };
  const call = async () => { if (!await callWorker(phone)) setMessage('Add a valid phone number to call this worker.'); };
  const { hasHistory, activePunch, activeShift, missingCheckout, onSite, minutesThisMonth, payThisMonth, upcoming, completed } = useMemo(() => {
    const workerPunches = punches.filter(p => p.workerId === worker.id).sort((a, b) => a.at.localeCompare(b.at));
    const lastByShift = new Map(workerPunches.map(p => [p.shiftId, p]));
    const activePunch = [...lastByShift.values()].find(p => p.type === 'in' && shifts.some(shift => shift.id === p.shiftId && shift.date === today()));
    const missingCheckout = [...lastByShift.values()].some(p => p.type === 'in' && shifts.some(shift => shift.id === p.shiftId && shift.date < today()));
    const month = today().slice(0, 7);
    const workDates = [...new Set(workerPunches.map(p => p.workDate ?? localDate(new Date(p.at))).filter(date => date.startsWith(month)))];
    const thisMonth = workDates.map(date => paySummary(punches, worker, date));
    return {
      hasHistory: workerPunches.length > 0,
      activePunch,
      missingCheckout,
      activeShift: shifts.find(shift => shift.id === activePunch?.shiftId),
      onSite: !!activePunch,
      minutesThisMonth: thisMonth.reduce((total, day) => total + day.actualMinutes, 0),
      payThisMonth: thisMonth.reduce((total, day) => total + day.earningsCents, 0),
      upcoming: shifts.filter(shift => !shift.archived && shift.workerIds.includes(worker.id) && shift.date >= today() && !lastByShift.has(shift.id)).length,
      completed: [...lastByShift.values()].filter(p => p.type === 'out').length,
    };
  }, [punches, shifts, worker]);
  const remove = () => {
    if (onSite || missingCheckout) return setMessage(missingCheckout ? 'A past shift has a missing check-out. Resolve that time record before removing this profile.' : 'Check this worker out before removing the profile.');
    confirmRemoval('Remove worker?', hasHistory ? 'This worker will leave the active team. Past time and pay records remain available.' : 'This worker will be removed from the team and future assignments.', () => { removeWorker(worker.id); router.replace('/team'); });
  };
  return <Screen back noNav title="Worker profile" subtitle="Live status, work history, and contact details">
    <Card style={{ flexDirection: 'row', alignItems: 'center' }}><Avatar worker={worker} size={51} /><View style={{ flex: 1, marginLeft: 13 }}><Text style={{ color: C.ink, fontSize: 17, fontWeight: '500' }}>{worker.name}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{worker.role} · {worker.team}</Text></View><View style={{ backgroundColor: onSite ? C.mint : C.subtle, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 16 }}><Text style={{ color: onSite ? C.green : C.muted, fontSize: 11, fontWeight: '500' }}>{onSite ? 'Active now' : 'Off the clock'}</Text></View></Card>
    {missingCheckout && <Text style={{ color: C.red, fontSize: 12, marginTop: 10 }}>A past shift is missing a check-out.</Text>}
    {activePunch && <Card style={{ marginTop: 12, backgroundColor: C.mint, borderColor: C.line }}><Text style={{ color: C.green, fontSize: 12, fontWeight: '500' }}>CURRENTLY CHECKED IN</Text><Text style={{ color: C.ink, fontSize: 16, fontWeight: '500', marginTop: 5 }}>{activeShift?.title ?? 'Active shift'}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{activeShift?.site ? `${activeShift.site} · ` : ''}Since {formatTime(activePunch.at)}</Text></Card>}
    <Section title="At a glance" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {[
        { label: 'Hours this month', value: hoursLabel(minutesThisMonth) },
        { label: 'Estimated pay', value: formatMoney(payThisMonth, currency) },
        { label: 'Upcoming shifts', value: String(upcoming) },
        { label: 'Completed shifts', value: String(completed) },
      ].map(stat => <Card key={stat.label} style={{ width: '48%', flexGrow: 1, padding: 15 }}><Text style={{ color: C.muted, fontSize: 11, fontWeight: '600' }}>{stat.label}</Text><Text style={{ color: C.ink, fontSize: 20, fontWeight: '500', marginTop: 7 }}>{stat.value}</Text></Card>)}
    </View>
    {activeShift && <Text style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>Assigned {formatDay(activeShift.date)}</Text>}
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}><View style={{ flex: 1 }}><Button label={phone ? `Call ${worker.name.split(' ')[0]}` : 'Add a phone to call'} variant="outline" icon={<Phone size={17} color={C.green} />} onPress={call} /></View><View style={{ flex: 1 }}><Button label="Message" variant="outline" icon={<MessageSquare size={17} color={C.green} />} onPress={async () => { if (!await messageWorker(phone)) setMessage('Add a valid phone number to message this worker.'); }} /></View></View>
    <Section title="Role tags" />
    <RolePicker selected={workerRoles[worker.id] ?? []} onChange={ids => setWorkerRoles(worker.id, ids)} currency={currency} />
    <Section title="Tasks" />
    <TaskList workerId={worker.id} admin />
    <Section title="Edit details" />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 20 }}><Avatar worker={{ ...worker, photoUri }} size={58} /><View><Pressable accessibilityRole="button" onPress={async () => { try { const picked = await chooseProfilePhoto(); if (picked) setPhotoUri(picked); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not open that photo.'); } }} style={{ paddingVertical: 7 }}><Text style={{ color: C.green, fontWeight: '500', fontSize: 13 }}>{photoUri ? 'Change photo' : 'Add profile photo'}</Text></Pressable>{!!photoUri && <Pressable accessibilityRole="button" onPress={() => setPhotoUri(undefined)} style={{ paddingVertical: 5 }}><Text style={{ color: C.muted, fontSize: 12 }}>Remove photo</Text></Pressable>}</View></View>
    <Field label="Full name" value={name} onChangeText={setName} placeholder="Full name" />
    <Field label="Job title" value={job} onChangeText={setJob} placeholder="Job title" />
    <Field label="Team" value={team} onChangeText={setTeam} placeholder="Team" />
    <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Include country code" keyboardType="phone-pad" />
    <Field label={`Hourly rate (${currency})`} value={rate} onChangeText={setRate} placeholder="e.g. 40.00" keyboardType="decimal-pad" />
    <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginBottom: 17 }}>Current rate: {formatMoney(Math.round(worker.hourlyRate * 100), currency)}/hour. A rate change applies to future check-ins; recorded sessions retain their original rate.</Text>
    {!!message && <Text style={{ color: C.red, marginBottom: 12 }}>{message}</Text>}
    <Button label="Save worker" onPress={save} />
    <View style={{ marginTop: 13 }}><Button label="Remove worker" variant="danger" icon={<Trash2 size={17} color={C.red} />} onPress={remove} /></View>
    {!!punches.length && <Text style={{ color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 18 }}>Existing time records remain on this device.</Text>}
  </Screen>;
}
