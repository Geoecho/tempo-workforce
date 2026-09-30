import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { localDate, today } from '../lib/data';
import { useFeedback } from '../lib/feedback';
import { useStore } from '../lib/store';
import { Avatar, Button, Card, Screen, Section, SelectionMark } from '../ui/components';
import { Field } from '../ui/Field';
import { ShiftDateTimeFields } from '../ui/ShiftDateTimeFields';
import { C } from '../ui/theme';

export default function NewShift() {
  const { play } = useFeedback();
  const { addShift, workers, role } = useStore(); const [title, setTitle] = useState(''); const [site, setSite] = useState(''); const [location, setLocation] = useState(''); const [date, setDate] = useState(today()); const [start, setStart] = useState('09:00'); const [end, setEnd] = useState('17:00'); const [selected, setSelected] = useState<string[]>([]); const [message, setMessage] = useState('');
  const toggle = (id: string) => { play('select'); setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); };
  const save = () => { if (!title.trim() || !site.trim() || !location.trim()) return setMessage('Fill in the title, site, and location.'); if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00`).getTime()) || localDate(new Date(`${date}T12:00:00`)) !== date) return setMessage('Use a valid date in YYYY-MM-DD format.'); if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end <= start) return setMessage('Use valid 24-hour times, with the end after the start.'); if (!selected.length) return setMessage('Select at least one team member.'); addShift({ title: title.trim(), site: site.trim(), location: location.trim(), date, start, end, team: workers.find(w => w.id === selected[0])?.team ?? 'General', workerIds: selected }); router.back(); };
  if (role !== 'admin') return <Screen back title="Admin only"><Text>This action requires an admin account.</Text></Screen>;
  return <Screen back noNav title="Create a shift" subtitle="Set the details, then assign your crew."><Field label="Shift name" value={title} onChangeText={setTitle} placeholder="e.g. Main stage setup" /><Field label="Site / project" value={site} onChangeText={setSite} placeholder="e.g. Northline Festival" /><Field label="Meeting point" value={location} onChangeText={setLocation} placeholder="e.g. East Gate" /><ShiftDateTimeFields date={date} onDateChange={setDate} start={start} onStartChange={setStart} end={end} onEndChange={setEnd} /><Section title="Assign workers" /><Text style={{ color: C.muted, fontSize: 12, marginBottom: 11 }}>{selected.length} selected</Text><Card style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>{workers.filter(w => !w.archived).map((w, i) => <Pressable key={w.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(w.id) }} onPress={() => toggle(w.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: i ? 1 : 0, borderColor: C.line }}><Avatar worker={w} size={36} /><View style={{ flex: 1, marginLeft: 11 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{w.name}</Text><Text style={{ color: C.muted, fontSize: 11 }}>{w.role} · {w.team}</Text></View><SelectionMark selected={selected.includes(w.id)} /></Pressable>)}</Card>{!!message && <Text style={{ color: C.red, marginBottom: 12 }}>{message}</Text>}<Button label="Create shift" onPress={save} /></Screen>;
}
