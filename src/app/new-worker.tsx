import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import { Button, Screen } from '../ui/components';
import { Field } from '../ui/Field';
import { C } from '../ui/theme';

export default function NewWorker() {
  const { addWorker, role, workers, currency } = useStore();
  const [name, setName] = useState('');
  const [job, setJob] = useState('');
  const [phone, setPhone] = useState('');
  const [rate, setRate] = useState('');
  const [team, setTeam] = useState('Production');
  const [error, setError] = useState('');
  const teams = [...new Set([...workers.map(w => w.team), 'Production', 'Operations'])];
  const save = () => {
    const hourlyRate = Number(rate.replace(',', '.'));
    if (!name.trim() || !job.trim()) return setError('Add a name and job title.');
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0 || hourlyRate > 10_000) return setError('Enter a valid hourly rate above zero.');
    addWorker({ name: name.trim(), role: job.trim(), phone: phone.trim(), team, hourlyRate: Math.round(hourlyRate * 100) / 100 });
    router.back();
  };
  if (role !== 'admin') return <Screen back title="Admin only"><Text>This action requires an admin account.</Text></Screen>;
  return <Screen back noNav title="Add team member" subtitle="Contact and pay details stay with their profile.">
    <Field label="Full name" value={name} onChangeText={setName} placeholder="e.g. Jamie Parker" />
    <Field label="Job title" value={job} onChangeText={setJob} placeholder="e.g. Stage technician" />
    <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Include country code" keyboardType="phone-pad" />
    <Field label={`Hourly rate (${currency})`} value={rate} onChangeText={setRate} placeholder="e.g. 40.00" keyboardType="decimal-pad" />
    <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13, marginBottom: 9 }}>Team</Text>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 27 }}>{teams.map(t => <Pressable key={t} onPress={() => setTeam(t)} style={{ borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: team === t ? C.green : C.surface, borderWidth: 1, borderColor: team === t ? C.green : C.line }}><Text style={{ color: team === t ? '#fff' : C.muted, fontSize: 13, fontWeight: '700' }}>{t}</Text></Pressable>)}</View>
    {!!error && <Text style={{ color: C.red, marginBottom: 13 }}>{error}</Text>}
    <Button label="Add team member" onPress={save} />
  </Screen>;
}
