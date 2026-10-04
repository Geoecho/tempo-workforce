import { router, useLocalSearchParams } from 'expo-router';
import { ContentGrid } from '../ui/ContentGrid';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../lib/store';
import { useExtras } from '../lib/extras';
import { Avatar, Button, Card, Screen } from '../ui/components';
import { ChoiceChips } from '../ui/ChoiceChips';
import { Field } from '../ui/Field';
import { Text } from '../ui/LocalizedText';
import { TaskList } from '../ui/extras-ui';
import { useTheme } from '../ui/theme';

export default function Tasks() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { role, workers, selectedWorkerId } = useStore();
  const { tasks, taskError } = useExtras();
  const C = useTheme().colors;
  const [status, setStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(8);
  const focusedTask = tasks.find(task => task.id === taskId);
  const matchingStatus = (id: string) => !!focusedTask || status === 'all' || tasks.some(task => task.workerId === id && (status === 'completed') === !!task.doneAt);
  const people = workers.filter(worker => (!focusedTask || worker.id === focusedTask.workerId) && matchingStatus(worker.id) && (!worker.archived || tasks.some(task => task.workerId === worker.id)) && (role === 'admin' || worker.id === selectedWorkerId) && (!!focusedTask || !query || `${worker.name} ${worker.team}`.toLowerCase().includes(query.toLowerCase()) || tasks.some(task => task.workerId === worker.id && task.title.toLowerCase().includes(query.toLowerCase()))));
  return <Screen back focused={false} title={role === 'admin' ? 'Team tasks' : 'Your tasks'} subtitle={role === 'admin' ? 'Assign tasks and review completed work with photo proof.' : 'Your assigned work and completed tasks.'}>
    {!!taskId && <View style={{ marginBottom: 16 }}><Button label="Show all tasks" small variant="outline" onPress={() => { setStatus('all'); router.replace('/tasks'); }} /></View>}
    <Field label="Search workers or tasks" placeholder="Search workers or tasks" value={query} onChangeText={value => { setQuery(value); setLimit(8); }} />
    <ChoiceChips label="Task status" value={status} onChange={value => setStatus(value as typeof status)} options={[{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }, { value: 'all', label: 'All' }]} />
    {!!taskError && <Text accessibilityRole="alert" style={{ color: C.red, marginTop: 16 }}>{taskError}</Text>}
    {!people.length && <Card style={{ marginTop: 16 }}><Text style={{ color: C.muted }}>No tasks match this view.</Text></Card>}
    <View style={{ marginTop: 16 }}><ContentGrid gap={16}>{people.slice(0, limit).map(worker => <Card key={worker.id} style={{ padding: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}><Avatar worker={worker} /><View style={{ flex: 1, minWidth: 0 }}><Text style={{ fontSize: 17, fontWeight: '600' }}>{worker.name}</Text><Text style={{ color: C.muted, marginTop: 4 }}>{worker.team}</Text></View></View>
      <TaskList workerId={worker.id} admin={role === 'admin'} status={focusedTask ? 'all' : status} taskId={focusedTask?.id} query={focusedTask || `${worker.name} ${worker.team}`.toLowerCase().includes(query.toLowerCase()) ? '' : query} />
    </Card>)}</ContentGrid></View>
    {people.length > limit && <View style={{ marginTop: 20 }}><Button label="View more" variant="outline" onPress={() => setLimit(value => value + 8)} /></View>}
  </Screen>;
}
