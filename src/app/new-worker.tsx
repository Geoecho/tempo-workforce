import { monthlyHourlyRate } from '../lib/monthly-pay';
import { ChoiceChips } from '../ui/ChoiceChips';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { useStore } from '../lib/store';
import { Avatar, Button, Screen, Section } from '../ui/components';
import { Field } from '../ui/Field';
import { useTheme } from '../ui/theme';
import { formatMoney, teamNames } from '../lib/data';
import { chooseProfilePhoto } from '../lib/profile-photo';

export default function NewWorker() {
  const C = useTheme().colors;
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1200;
  const [payType, setPayType] = useState<'hourly' | 'fixed'>('hourly');
  const [salary, setSalary] = useState('');
  const [monthlyHours, setMonthlyHours] = useState('160');
  const { team: suggestedTeam } = useLocalSearchParams<{ team?: string }>();
  const { addWorker, role, workers, teams: savedTeams, currency } = useStore();
  const teams = teamNames({ teams: savedTeams, workers });
  const [name, setName] = useState('');
  const [job, setJob] = useState('');
  const [phone, setPhone] = useState('');
  const [rate, setRate] = useState('');
  const [team, setTeam] = useState(teams.includes(suggestedTeam ?? '') ? suggestedTeam! : (teams[0] ?? ''));
  const [error, setError] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const save = () => {
    const hourlyRate = payType === 'fixed' ? monthlyHourlyRate(Number(salary.replace(',', '.')), Number(monthlyHours.replace(',', '.'))) ?? 0 : Number(rate.replace(',', '.'));
    if (!name.trim() || !job.trim()) return setError('Add a name and job title.');
    if (!team) return setError('Create a team from People & teams first.');
    if (payType === 'fixed' && !hourlyRate) return setError('Enter a monthly salary and valid contracted hours.');
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0 || hourlyRate > 10_000) return setError('Enter a valid hourly rate above zero.');
    addWorker({ name: name.trim(), role: job.trim(), phone: phone.trim(), team, photoUri, hourlyRate: Math.round(hourlyRate * 100) / 100, ...(payType === 'fixed' ? { payConfig: { type: 'fixed' as const, amount: Number(salary.replace(',', '.')), monthlyHours: Number(monthlyHours.replace(',', '.')) } } : {}) });
    router.replace('/team');
  };
  if (role !== 'admin') return <Screen back title="Admin only"><Text>This action requires an admin account.</Text></Screen>;
  return <Screen back focused={false} title="Add team member" subtitle="Contact and pay details stay with their profile.">
    <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 28 : 0, alignItems: 'flex-start' }}>
    <View style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : '100%', minWidth: 0 }}>
    <Section title="Personal details" />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 18 }}><Avatar worker={{ id: '', name: name || 'New member', initials: name.trim().split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase() || '+', role: job, team, color: C.mint, hourlyRate: 0, photoUri }} size={58} /><Pressable accessibilityRole="button" onPress={async () => { try { const picked = await chooseProfilePhoto(); if (picked) setPhotoUri(picked); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open that photo.'); } }} style={{ paddingVertical: 12 }}><Text style={{ color: C.green, fontWeight: '500', fontSize: 13 }}>{photoUri ? 'Change photo' : 'Add profile photo'}</Text></Pressable></View>
    <Field label="Full name" value={name} onChangeText={setName} placeholder="e.g. Jamie Parker" />
    <Field label="Job title" value={job} onChangeText={setJob} placeholder="e.g. Stage technician" />
    <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Include country code" keyboardType="phone-pad" />
    </View><View style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : '100%', minWidth: 0 }}>
    <Section title="Team & pay" />
    <Text style={{ color: C.ink, fontWeight: '500', fontSize: 13, marginBottom: 9 }}>Team</Text>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 27 }}>{teams.map(t => <Pressable key={t} onPress={() => setTeam(t)} style={{ borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: team === t ? C.green : C.surface, borderWidth: 1, borderColor: team === t ? C.green : C.line }}><Text style={{ color: team === t ? C.onGreen : C.muted, fontSize: 13, fontWeight: '500' }}>{t}</Text></Pressable>)}</View>
    <View style={{ paddingTop: 24, borderTopWidth: 1, borderTopColor: C.line, marginBottom: 24 }}>
    <Text style={{ fontWeight: '600', fontSize: 14, marginBottom: 14 }}>Pay details</Text>
    <View style={{ marginBottom: 22 }}>    <ChoiceChips label="Pay type" value={payType} onChange={value => setPayType(value as 'hourly' | 'fixed')} options={[{ value: 'hourly', label: 'Hourly' }, { value: 'fixed', label: 'Monthly' }]} /></View>
    {payType === 'hourly' ? <Field label={`Hourly rate (${currency})`} value={rate} onChangeText={setRate} placeholder="e.g. 40.00" keyboardType="decimal-pad" /> : <>
      <Field label="Monthly salary" value={salary} onChangeText={setSalary} placeholder="Monthly salary" keyboardType="decimal-pad" />
      <Field label="Contracted hours per month" value={monthlyHours} onChangeText={setMonthlyHours} placeholder="160" keyboardType="decimal-pad" />
      <Text style={{ color: C.green, fontSize: 13, marginBottom: 16 }}>Hourly equivalent: {formatMoney(Math.round((monthlyHourlyRate(Number(salary.replace(',', '.')), Number(monthlyHours.replace(',', '.'))) ?? 0) * 100), currency)}/h</Text>
    </>}
    </View>
    {!!error && <Text style={{ color: C.red, marginBottom: 13 }}>{error}</Text>}
    <Button label="Add team member" onPress={save} />
    </View></View>
  </Screen>;
}
