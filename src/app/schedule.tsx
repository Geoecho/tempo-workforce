import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { today } from '../lib/data';
import { useStore } from '../lib/store';
import { Button, Empty, Screen } from '../ui/components';
import { ShiftCard } from '../ui/ShiftCard';
import { C } from '../ui/theme';

export default function Schedule() {
  const { role, shifts, selectedWorkerId } = useStore();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 960;
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');
  const filtered = shifts
    .filter(s => !s.archived && (role === 'admin' || s.workerIds.includes(selectedWorkerId)) && (filter === 'all' || s.date >= today()))
    .sort((a, b) => a.date.localeCompare(b.date));

  return <Screen
    title={role === 'admin' ? 'Shifts' : 'My shifts'}
    subtitle={role === 'admin' ? 'Plan work and keep every site covered.' : 'Everything you need for your upcoming work.'}
  >
    <View style={{ flexDirection: 'row', gap: 9, marginBottom: 23 }}>
      {(['upcoming', 'all'] as const).map(item => <Pressable
        key={item}
        onPress={() => setFilter(item)}
        style={{ backgroundColor: filter === item ? C.green : C.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: filter === item ? C.green : C.line }}
      ><Text style={{ color: filter === item ? '#fff' : C.muted, fontWeight: '700', fontSize: 13 }}>{item === 'upcoming' ? 'Upcoming' : 'All shifts'}</Text></Pressable>)}
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
      <Text style={{ color: C.ink, fontSize: 16, fontWeight: '700' }}>{filtered.length} shifts</Text>
      {role === 'admin' && <Button label="New shift" small icon={<Plus size={16} color="#fff" />} onPress={() => router.push('/new-shift')} />}
    </View>
    {filtered.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {filtered.map(s => <View key={s.id} style={{ width: desktop ? '49%' : '100%' }}><ShiftCard shift={s} /></View>)}
    </View> : <Empty title="Nothing on the calendar" detail="New assignments will appear here when they're scheduled." />}
  </Screen>;
}
