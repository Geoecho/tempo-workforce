import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { localDate, repeatShiftDates, ShiftRepeat, today } from '../lib/data';
import { useFeedback } from '../lib/feedback';
import { useStore } from '../lib/store';
import { Avatar, Button, Card, Screen, Section, SelectionMark } from '../ui/components';
import { Field } from '../ui/Field';
import { ShiftDateTimeFields } from '../ui/ShiftDateTimeFields';
import { SitePinPicker } from '../ui/SitePinPicker';
import type { SitePin } from '../lib/site-location';
import { C } from '../ui/theme';

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
  const { play } = useFeedback();
  const { addShifts, workers, role } = useStore();
  const [title, setTitle] = useState('');
  const [site, setSite] = useState('');
  const [location, setLocation] = useState('');
  const [pin, setPin] = useState<SitePin | null>(null);
  const [date, setDate] = useState(today());
  const [until, setUntil] = useState(() => defaultRepeatUntil(today()));
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
    addShifts(dates.map(day => ({ title: title.trim(), site: site.trim(), location: location.trim(), ...(pin ?? {}), date: day, start, end, team: workers.find(w => w.id === selected[0])?.team ?? 'General', workerIds: selected })));
    router.replace('/schedule');
  };
  if (role !== 'admin') return <Screen back title="Admin only"><Text>This action requires an admin account.</Text></Screen>;
  return <Screen back noNav title="Create a shift" subtitle="Schedule one day or a month at the same place."><Field label="Shift name" value={title} onChangeText={setTitle} placeholder="e.g. Main stage setup" /><Field label="Site / project" value={site} onChangeText={setSite} placeholder="e.g. Northline Festival" /><Field label="Meeting point" value={location} onChangeText={setLocation} placeholder="e.g. East Gate" /><SitePinPicker pin={pin} onChange={setPin} site={site} location={location} /><ShiftDateTimeFields date={date} onDateChange={changeDate} start={start} onStartChange={setStart} end={end} onEndChange={setEnd} until={repeat === 'once' ? undefined : until} onUntilChange={repeat === 'once' ? undefined : setUntil} />
    <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13, marginBottom: 8 }}>Repeat</Text>
    <View style={{ flexDirection: 'row', gap: 7, marginBottom: 8 }}>{([['once', 'One day'], ['daily', 'Every day'], ['weekdays', 'Weekdays']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: repeat === value }} onPress={() => { play('select'); setRepeat(value); setMessage(''); }} style={{ flex: 1, minHeight: 45, borderRadius: 12, borderWidth: 1, borderColor: repeat === value ? C.green : C.line, backgroundColor: repeat === value ? C.mint : C.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><Text style={{ color: repeat === value ? C.green : C.muted, fontWeight: '700', fontSize: 12 }}>{label}</Text></Pressable>)}</View>
    {repeat !== 'once' && <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>{dates.length} separate daily shifts will be created. Each day has its own QR code and clock history. You can change a day later.</Text>}
    <Section title="Assign workers" /><Text style={{ color: C.muted, fontSize: 12, marginBottom: 11 }}>{selected.length} selected</Text><Card style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>{workers.filter(w => !w.archived).map((w, i) => <Pressable key={w.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(w.id) }} onPress={() => toggle(w.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: i ? 1 : 0, borderColor: C.line }}><Avatar worker={w} size={36} /><View style={{ flex: 1, marginLeft: 11 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{w.name}</Text><Text style={{ color: C.muted, fontSize: 11 }}>{w.role} · {w.team}</Text></View><SelectionMark selected={selected.includes(w.id)} /></Pressable>)}</Card>{!!message && <Text style={{ color: C.red, marginBottom: 12 }}>{message}</Text>}<Button label={dates.length > 1 ? `Create ${dates.length} shifts` : 'Create shift'} onPress={save} /></Screen>;
}
