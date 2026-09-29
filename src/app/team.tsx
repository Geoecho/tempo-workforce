import { router } from 'expo-router';
import { ChevronRight, Phone, Plus, Search, UsersRound } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { formatMoney, Worker } from '../lib/data';
import { callWorker } from '../lib/phone';
import { useStore } from '../lib/store';
import { Avatar, Card, Screen } from '../ui/components';
import { C } from '../ui/theme';

export default function Team() {
  const { workers, shifts, role, currency } = useStore();
  const [query, setQuery] = useState('');
  const teams = [...new Set(workers.map(w => w.team))];
  const shown = workers.filter(w => `${w.name} ${w.role} ${w.team}`.toLowerCase().includes(query.toLowerCase()));
  if (role !== 'admin') return <Screen title="Admin only"><Text style={{ color: C.muted }}>Worker profiles are managed by admins.</Text></Screen>;
  return <Screen title="People & teams" subtitle="Know who is working and reach them quickly.">
    <View style={{ flexDirection: 'row', gap: 9, marginBottom: 21 }}>
      <View style={{ flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 13, minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Search size={17} color={C.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search people or teams" placeholderTextColor="#A0AAA3" style={{ flex: 1, color: C.ink, fontSize: 13 }} /></View>
      <Pressable accessibilityLabel="Add worker" onPress={() => router.push('/new-worker')} style={{ width: 46, height: 46, backgroundColor: C.green, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}><Plus size={21} color="#fff" /></Pressable>
    </View>
    <Card style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}><View style={{ backgroundColor: C.mint, borderRadius: 12, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}><UsersRound color={C.green} size={20} /></View><View style={{ marginLeft: 13 }}><Text style={{ color: C.ink, fontSize: 19, fontWeight: '700' }}>{workers.length} people</Text><Text style={{ color: C.muted, fontSize: 12 }}>{teams.length} teams across your organization</Text></View></Card>
    {teams.map(team => { const people = shown.filter(w => w.team === team); if (!people.length) return null; return <View key={team}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 16, marginBottom: 11 }}>{team} <Text style={{ color: C.muted, fontSize: 12 }}>({people.length})</Text></Text><Card style={{ padding: 0, marginBottom: 23, overflow: 'hidden' }}>{people.map((worker, i) => <WorkerRow key={worker.id} worker={worker} shifts={shifts.filter(s => s.workerIds.includes(worker.id)).length} currency={currency} first={i === 0} />)}</Card></View>; })}
    {!shown.length && <Card><Text style={{ color: C.muted }}>No people match your search.</Text></Card>}
  </Screen>;
}

function WorkerRow({ worker, shifts, currency, first }: { worker: Worker; shifts: number; currency: 'PLN' | 'EUR' | 'USD' | 'GBP'; first: boolean }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: first ? 0 : 1, borderTopColor: C.line }}>
    <Pressable onPress={() => router.push({ pathname: '/worker/[id]', params: { id: worker.id } })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}><Avatar worker={worker} size={40} /><View style={{ marginLeft: 12, flex: 1 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 14 }}>{worker.name}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{worker.role} · {shifts} shifts</Text><Text style={{ color: C.green, fontSize: 11, fontWeight: '700', marginTop: 3 }}>{formatMoney(Math.round(worker.hourlyRate * 100), currency)}/h</Text></View></Pressable>
    {worker.phone && <Pressable accessibilityLabel={`Call ${worker.name}`} onPress={() => callWorker(worker.phone)} style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginRight: 5 }}><Phone size={17} color={C.green} /></Pressable>}
    <Pressable accessibilityLabel={`Open ${worker.name} profile`} onPress={() => router.push({ pathname: '/worker/[id]', params: { id: worker.id } })} style={{ width: 28, height: 36, alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={17} color={C.muted} /></Pressable>
  </View>;
}
