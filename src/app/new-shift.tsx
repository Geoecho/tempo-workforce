import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { localDate, repeatShiftDates, ShiftRepeat, today, uid } from '../lib/data';
import { useFeedback } from '../lib/feedback';
import { useStore } from '../lib/store';
import { Avatar, Button, Card, Screen, SelectionMark } from '../ui/components';
import { Field } from '../ui/Field';
import { ShiftDateTimeFields } from '../ui/ShiftDateTimeFields';
import { SitePinPicker } from '../ui/SitePinPicker';
import type { SitePin } from '../lib/site-location';
import { useTheme } from '../ui/theme';

const defaultRepeatUntil = (value: string) => {
  const start = new Date(`${value}T12:00:00`);
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
  if ((monthEnd.getTime() - start.getTime()) / 86400000 < 7) {
    const thirtyDays = new Date(start);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return localDate(thirtyDays);
  }
  return localDate(monthEnd);
};

export default function NewShift() {
  const C = useTheme().colors;
  const { play } = useFeedback();
  const { addShifts, workers, role } = useStore();
  const [title, setTitle] = useState('');
  const [site, setSite] = useState('');
  const [location, setLocation] = useState('');
  const [pin, setPin] = useState<SitePin | null>(null);
  const params = useLocalSearchParams<{ date?: string }>();
  const initial = typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today();
  const [date, setDate] = useState(initial);
  const [until, setUntil] = useState(() => defaultRepeatUntil(initial));
  const [repeat, setRepeat] = useState<ShiftRepeat>('once');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const dates = repeatShiftDates(date, until, repeat);
  const toggle = (id: string) => { play('select'); setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); };
  const changeDate = (value: string) => {
    setDate(value);
    setUntil(defaultRepeatUntil(value));
  };
  const save = () => {
    if (!title.trim() || !site.trim() || !location.trim()) return setMessage('Fill in the title, site, and location.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00`).getTime()) || localDate(new Date(`${date}T12:00:00`)) !== date) return setMessage('Choose a valid start date.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end <= start) return setMessage('Use valid 24-hour times, with the end after the start.');
    if (!selected.length) return setMessage('Select at least one team member.');
    const maxRepeatDate = new Date(`${date}T12:00:00`);
    maxRepeatDate.setDate(maxRepeatDate.getDate() + 30);
    if (repeat !== 'once' && (until < date || until > localDate(maxRepeatDate))) return setMessage('Choose a repeat end date within 31 days of the first shift.');
    if (!dates.length) return setMessage('No workdays fall in this date range.');
    const seriesId = dates.length > 1 ? uid() : undefined;
    addShifts(dates.map(day => ({ title: title.trim(), site: site.trim(), location: location.trim(), ...(pin ?? {}), seriesId, date: day, start, end, team: workers.find(w => w.id === selected[0])?.team ?? 'General', workerIds: selected })));
    router.replace('/schedule');
  };
  if (role !== 'admin') return <Screen back title="Admin only"><Text>This action requires an admin account.</Text></Screen>;
  const people = workers.filter(w => !w.archived);
  const teamList = [...new Set(people.map(w => w.team).filter(Boolean))];
  const selectTeam = (team: string | null) => { play('select'); const ids = people.filter(w => team === null || w.team === team).map(w => w.id); setSelected(cur => ids.every(id => cur.includes(id)) ? cur.filter(id => !ids.includes(id)) : [...new Set([...cur, ...ids])]); };
  const stepTitle = (n: number, label: string) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 12 }}><View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.onGreen, fontSize: 12, fontWeight: '600' }}>{n}</Text></View><Text style={{ color: C.ink, fontSize: 16, fontWeight: '600' }}>{label}</Text></View>;
  if (role !== 'admin') return <Screen back title="Admin only"><Text>This action requires an admin account.</Text></Screen>;
  return <Screen back noNav title="Create a shift" subtitle="Schedule one day or a month at the same place.">
    {stepTitle(1, 'Details')}
    <Card style={{ paddingBottom: 4, marginBottom: 20 }}>
      <Field label="Shift name" value={title} onChangeText={setTitle} placeholder="e.g. Main stage setup" />
      <Field label="Site / project" value={site} onChangeText={setSite} placeholder="e.g. Northline Festival" />
      <Field label="Meeting point" value={location} onChangeText={setLocation} placeholder="e.g. East Gate" />
      <SitePinPicker pin={pin} onChange={setPin} site={site} location={location} />
    </Card>
    {stepTitle(2, 'When')}
    <Card style={{ marginBottom: 20 }}>
      <ShiftDateTimeFields date={date} onDateChange={changeDate} start={start} onStartChange={setStart} end={end} onEndChange={setEnd} until={repeat === 'once' ? undefined : until} onUntilChange={repeat === 'once' ? undefined : setUntil} />
      <Text style={{ color: C.ink, fontWeight: '500', fontSize: 13, marginBottom: 8 }}>Repeat</Text>
      <View style={{ flexDirection: 'row', backgroundColor: C.subtle, borderRadius: 13, padding: 4, gap: 4 }}>{([['once', 'One day'], ['daily', 'Every day'], ['weekdays', 'Weekdays']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: repeat === value }} onPress={() => { play('select'); setRepeat(value); setMessage(''); }} style={{ flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: repeat === value ? C.surface : 'transparent', borderWidth: repeat === value ? 1 : 0, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: repeat === value ? C.green : C.muted, fontWeight: '600', fontSize: 12 }}>{label}</Text></Pressable>)}</View>
      {repeat !== 'once' && <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 10 }}>{dates.length} separate daily shifts will be created. Each day has its own QR code and clock history.</Text>}
    </Card>
    {stepTitle(3, 'Who is working')}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      {[null, ...teamList].map(team => { const ids = people.filter(w => team === null || w.team === team).map(w => w.id); const on = ids.length > 0 && ids.every(id => selected.includes(id)); return <Pressable key={team ?? 'all'} accessibilityRole="button" onPress={() => selectTeam(team)} style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: on ? C.green : C.line, backgroundColor: on ? C.mint : C.surface }}><Text style={{ color: on ? C.green : C.muted, fontSize: 12, fontWeight: '500' }}>{team ?? 'Everyone'}</Text></Pressable>; })}
    </View>
    <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>{people.map((w, i) => <Pressable key={w.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(w.id) }} onPress={() => toggle(w.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: i ? 1 : 0, borderColor: C.line, backgroundColor: selected.includes(w.id) ? C.mint : 'transparent' }}><Avatar worker={w} size={36} /><View style={{ flex: 1, marginLeft: 11 }}><Text style={{ color: C.ink, fontWeight: '500', fontSize: 13 }}>{w.name}</Text><Text style={{ color: C.muted, fontSize: 11 }}>{w.role} · {w.team}</Text></View><SelectionMark selected={selected.includes(w.id)} /></Pressable>)}{!people.length && <Text style={{ color: C.muted, padding: 16 }}>Add people on the Team tab first.</Text>}</Card>
    <Card style={{ backgroundColor: C.mint, borderColor: C.line, marginBottom: 14 }}><Text style={{ color: C.green, fontSize: 13, fontWeight: '500' }}>{title.trim() || 'Untitled shift'}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{dates.length > 1 ? `${dates.length} days from ${date}` : date} · {start}–{end} · {selected.length} {selected.length === 1 ? 'person' : 'people'}</Text></Card>
    {!!message && <Text style={{ color: C.red, marginBottom: 12 }}>{message}</Text>}
    <Button label={dates.length > 1 ? `Create ${dates.length} shifts` : 'Create shift'} onPress={save} />
  </Screen>;
}
