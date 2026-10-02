import { router } from 'expo-router';
import { ChevronRight, MessageSquare, Phone, Plus, Search, UsersRound } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text, TextInput } from '../ui/LocalizedText';
import { Currency, formatMoney, teamNames, Worker } from '../lib/data';
import { callWorker, messageWorker } from '../lib/phone';
import { useStore } from '../lib/store';
import { useLanguage } from '../lib/i18n';
import { Avatar, Card, Screen } from '../ui/components';
import { ContentGrid } from '../ui/ContentGrid';
import { WorkerInvitation } from '../ui/WorkerInvitation';
import { useTheme } from '../ui/theme';

export default function Team() {
  const C = useTheme().colors;
  const { t } = useLanguage();
  const { workers, shifts, role, currency, teams: savedTeams, addTeam } = useStore();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1200;
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTeam, setNewTeam] = useState('');
  const [error, setError] = useState('');
  const activeWorkers = workers.filter(worker => !worker.archived);
  const teams = teamNames({ teams: savedTeams, workers });
  const search = query.trim().toLowerCase();
  const shown = activeWorkers.filter(worker => `${worker.name} ${worker.role} ${worker.team}`.toLowerCase().includes(search));
  const visibleTeams = teams.filter(team => !search || team.toLowerCase().includes(search) || shown.some(worker => worker.team === team));
  const summary = <Card style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ backgroundColor: C.mint, borderRadius: 12, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}><UsersRound color={C.green} size={20} /></View><View style={{ marginLeft: 13 }}><Text style={{ color: C.ink, fontSize: 19, fontWeight: '500' }}>{activeWorkers.length} people</Text><Text style={{ color: C.muted, fontSize: 12 }}>{teams.length} teams across your organization</Text></View></Card>;

  const saveTeam = () => {
    const name = newTeam.trim();
    if (!name) return setError('Enter a team name.');
    if (name.length > 50) return setError('Keep the team name under 50 characters.');
    if (teams.some(team => team.toLowerCase() === name.toLowerCase())) return setError('That team already exists.');
    addTeam(name);
    setNewTeam('');
    setError('');
    setCreating(false);
  };

  if (role !== 'admin') return <Screen title="Admin only"><Text style={{ color: C.muted }}>Worker profiles are managed by admins.</Text></Screen>;

  return <Screen title="People & teams" subtitle="Organize your crew and reach them quickly.">
    <View style={{ flexDirection: desktop ? 'row' : 'column', alignItems: desktop ? 'center' : 'stretch', gap: desktop ? 12 : 0, marginBottom: desktop ? 20 : 0 }}>
    <View style={{ flex: desktop ? 1 : undefined, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 13, minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: desktop ? 0 : 12 }}>
      <Search size={17} color={C.muted} />
      <TextInput accessibilityLabel={t('Search people or teams')} value={query} onChangeText={setQuery} placeholder={t('Search people or teams')} placeholderTextColor={C.placeholder} style={{ flex: 1, color: C.ink, fontSize: 14 }} />
    </View>
    <View style={{ flexDirection: 'row', gap: 9, marginBottom: desktop ? 0 : 18 }}>
      <Pressable accessibilityRole="button" onPress={() => { setCreating(true); setError(''); }} style={{ width: desktop ? 135 : undefined, flex: desktop ? undefined : 1, minHeight: 45, borderRadius: 12, borderWidth: 1, borderColor: C.green, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <Plus size={17} color={C.green} /><Text style={{ color: C.green, fontWeight: '500' }}>{t('Add team')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/new-worker')} style={{ width: desktop ? 145 : undefined, flex: desktop ? undefined : 1, minHeight: 45, borderRadius: 12, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <Plus size={17} color={C.onGreen} /><Text style={{ color: C.onGreen, fontWeight: '500' }}>{t('Add person')}</Text>
      </Pressable>
    </View>
    </View>
    <WorkerInvitation />
    {creating && <Card style={{ marginBottom: 18 }}>
      <Text style={{ color: C.ink, fontWeight: '500', fontSize: 16, marginBottom: 5 }}>{t('New team')}</Text>
      <Text style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>{t('Create the team now, then add people to it.')}</Text>
      <TextInput accessibilityLabel="Team name" autoCapitalize="words" autoFocus value={newTeam} onChangeText={setNewTeam} onSubmitEditing={saveTeam} placeholder="e.g. Logistics" placeholderTextColor={C.placeholder} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 12, color: C.ink, backgroundColor: C.surface, fontSize: 15 }} />
      {!!error && <Text style={{ color: C.red, fontSize: 12, marginTop: 9 }}>{error}</Text>}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 18, marginTop: 16 }}>
        <Pressable onPress={() => { setCreating(false); setNewTeam(''); setError(''); }} style={{ padding: 8 }}><Text style={{ color: C.muted, fontWeight: '500' }}>{t('Cancel')}</Text></Pressable>
        <Pressable onPress={saveTeam} style={{ backgroundColor: C.green, borderRadius: 10, paddingHorizontal: 17, paddingVertical: 9 }}><Text style={{ color: C.onGreen, fontWeight: '500' }}>{t('Create team')}</Text></Pressable>
      </View>
    </Card>}
    <View style={{ marginBottom: 24 }}>{summary}</View>
    <ContentGrid>
    {visibleTeams.map(team => {
      const people = shown.filter(worker => worker.team === team);
      return <View key={team}>
        <Text style={{ color: C.ink, fontWeight: '500', fontSize: 16, marginBottom: 11 }}>{team} <Text style={{ color: C.muted, fontSize: 12 }}>({people.length})</Text></Text>
        {people.length ? <Card style={{ padding: 0, marginBottom: 23, overflow: 'hidden' }}>
          {people.map((worker, index) => <WorkerRow key={worker.id} worker={worker} shifts={shifts.filter(shift => shift.workerIds.includes(worker.id)).length} currency={currency} first={index === 0} />)}
        </Card> : <Card style={{ marginBottom: 23 }}><Text style={{ color: C.muted, fontSize: 14 }}>{t('No people in this team yet.')}</Text><Pressable onPress={() => router.push({ pathname: '/new-worker', params: { team } })} style={{ marginTop: 11 }}><Text style={{ color: C.green, fontWeight: '500', fontSize: 14 }}>{t('Add person')} →</Text></Pressable></Card>}
      </View>;
    })}
    {!visibleTeams.length && <Card><Text style={{ color: C.muted }}>{t(search ? 'No people or teams match your search.' : 'Create a team to get started.')}</Text></Card>}
    </ContentGrid>
  </Screen>;
}

function WorkerRow({ worker, shifts, currency, first }: { worker: Worker; shifts: number; currency: Currency; first: boolean }) {
  const C = useTheme().colors;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, alignItems: 'center', padding: 14, borderTopWidth: first ? 0 : 1, borderTopColor: C.line }}>
    <Pressable onPress={() => router.push({ pathname: '/worker/[id]', params: { id: worker.id } })} style={{ flex: 1, minWidth: 150, minHeight: 48, flexDirection: 'row', alignItems: 'center' }}><Avatar worker={worker} size={40} /><View style={{ marginLeft: 12, flex: 1 }}><Text style={{ color: C.ink, fontWeight: '500', fontSize: 14 }}>{worker.name}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{worker.role} · {shifts} shifts</Text><Text style={{ color: C.green, fontSize: 11, fontWeight: '500', marginTop: 3 }}>{formatMoney(Math.round(worker.hourlyRate * 100), currency)}/h</Text></View></Pressable>
    {worker.phone && <Pressable accessibilityLabel={`Call ${worker.name}`} onPress={() => callWorker(worker.phone)} style={{ width: 48, height: 48, borderRadius: 11, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginRight: 5 }}><Phone size={17} color={C.green} /></Pressable>}
    {worker.phone && <Pressable accessibilityLabel={`Message ${worker.name}`} onPress={() => void messageWorker(worker.phone)} style={{ width: 48, height: 48, borderRadius: 11, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginRight: 5 }}><MessageSquare size={17} color={C.green} /></Pressable>}
    <Pressable accessibilityLabel={`Open ${worker.name} profile`} onPress={() => router.push({ pathname: '/worker/[id]', params: { id: worker.id } })} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={17} color={C.muted} /></Pressable>
  </View>;
}
