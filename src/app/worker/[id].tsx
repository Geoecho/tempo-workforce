import { router, useLocalSearchParams } from 'expo-router';
import { Phone, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { formatMoney, Worker } from '../../lib/data';
import { confirmRemoval } from '../../lib/confirm';
import { callWorker } from '../../lib/phone';
import { useStore } from '../../lib/store';
import { Avatar, Button, Card, Screen, Section } from '../../ui/components';
import { Field } from '../../ui/Field';
import { C } from '../../ui/theme';

export default function WorkerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workers, ready, role } = useStore();
  const worker = workers.find(w => w.id === id);
  if (!ready) return <Screen back title="Loading worker"><Text style={{ color: C.muted }}>Loading profile…</Text></Screen>;
  if (!worker || role !== 'admin') return <Screen back title="Profile unavailable"><Text style={{ color: C.muted }}>This worker profile is not available.</Text></Screen>;
  return <WorkerEditor key={worker.id} worker={worker} />;
}

function WorkerEditor({ worker }: { worker: Worker }) {
  const { updateWorker, removeWorker, currency, punches, shifts } = useStore();
  const [name, setName] = useState(worker.name);
  const [job, setJob] = useState(worker.role);
  const [team, setTeam] = useState(worker.team);
  const [phone, setPhone] = useState(worker.phone ?? '');
  const [rate, setRate] = useState(String(worker.hourlyRate));
  const [message, setMessage] = useState('');
  const save = () => {
    const hourlyRate = Number(rate.replace(',', '.'));
    if (!name.trim() || !job.trim() || !team.trim()) return setMessage('Name, job title, and team are required.');
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0 || hourlyRate > 10_000) return setMessage('Enter a valid hourly rate above zero.');
    updateWorker(worker.id, { name: name.trim(), role: job.trim(), team: team.trim(), phone: phone.trim(), hourlyRate: Math.round(hourlyRate * 100) / 100 });
    router.back();
  };
  const call = async () => { if (!await callWorker(phone)) setMessage('Add a valid phone number to call this worker.'); };
  const hasHistory = punches.some(p => p.workerId === worker.id);
  const onSite = shifts.some(shift => [...punches].reverse().find(p => p.workerId === worker.id && p.shiftId === shift.id)?.type === 'in');
  const remove = () => {
    if (onSite) return setMessage('Check this worker out before removing the profile.');
    confirmRemoval('Remove worker?', hasHistory ? 'This worker will leave the active team. Past time and pay records remain available.' : 'This worker will be removed from the team and future assignments.', () => { removeWorker(worker.id); router.replace('/team'); });
  };
  return <Screen back noNav title="Worker profile" subtitle="Contact details and pay rate">
    <Card style={{ flexDirection: 'row', alignItems: 'center' }}><Avatar worker={worker} size={51} /><View style={{ flex: 1, marginLeft: 13 }}><Text style={{ color: C.ink, fontSize: 17, fontWeight: '700' }}>{worker.name}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{worker.role} · {worker.team}</Text></View></Card>
    <View style={{ marginTop: 12 }}><Button label={phone ? `Call ${worker.name.split(' ')[0]}` : 'Add a phone to call'} variant="outline" icon={<Phone size={17} color={C.green} />} onPress={call} /></View>
    <Section title="Edit details" />
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
