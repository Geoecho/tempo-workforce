import { EditScope, seriesTargets } from '../../lib/planning';
import { ChoiceChips } from '../../ui/ChoiceChips';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { Pressable } from '../../ui/LocalizedPressable';
import { Text } from '../../ui/LocalizedText';
import { useStore } from '../../lib/store';
import { useFeedback } from '../../lib/feedback';
import { Avatar, Button, Card, Screen, Section, SelectionMark } from '../../ui/components';
import { Field } from '../../ui/Field';
import { ShiftDateTimeFields } from '../../ui/ShiftDateTimeFields';
import { SitePinPicker } from '../../ui/SitePinPicker';
import type { SitePin } from '../../lib/site-location';
import { useTheme } from '../../ui/theme';
import { localDate, Shift } from '../../lib/data';

export default function EditShift() {
  const C = useTheme().colors;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shifts, role, ready } = useStore();
  const shift = shifts.find(s => s.id === id && !s.archived);
  if (!ready) return <Screen back title="Loading shift" />;
  if (!shift || role !== 'admin') return <Screen back title="Shift unavailable"><Text style={{ color: C.muted }}>This shift is not available.</Text></Screen>;
  return <ShiftEditor key={shift.id} shift={shift} />;
}

function ShiftEditor({ shift }: { shift: Shift }) {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1200;
  const C = useTheme().colors;
  const { play } = useFeedback();
  const { workers, punches, shifts, editShiftSeries } = useStore();
  const locked = punches.some(p => p.shiftId === shift.id);
  const [scope, setScope] = useState<EditScope>('one');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const targetCount = seriesTargets({ shifts, punches }, shift, scope).length;
  const [title, setTitle] = useState(shift.title);
  const [site, setSite] = useState(shift.site);
  const [location, setLocation] = useState(shift.location);
  const [pin, setPin] = useState<SitePin | null>(shift.latitude !== undefined && shift.longitude !== undefined ? { latitude: shift.latitude, longitude: shift.longitude } : null);
  const [date, setDate] = useState(shift.date);
  const [start, setStart] = useState(shift.start);
  const [end, setEnd] = useState(shift.end);
  const [selected, setSelected] = useState(shift.workerIds);
  const [message, setMessage] = useState('');
  const available = workers.filter(w => !w.archived);
  const toggle = (id: string) => { play('select'); setSelected(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]); };
  const save = async () => {
    if (saving.current) return;
    if (!title.trim() || !site.trim() || !location.trim()) return setMessage('Add a name, site, and meeting point.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00`).getTime()) || localDate(new Date(`${date}T12:00:00`)) !== date) return setMessage('Use a valid date in YYYY-MM-DD format.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end === start) return setMessage('Use valid 24-hour times, with the end after the start.');
    if (!locked && !selected.length) return setMessage('Assign at least one worker.');
    if (!targetCount) return setMessage('No editable shifts remain in this selection.');
    saving.current = true; setBusy(true);
    try { const result = await editShiftSeries(shift.id, { title: title.trim(), site: site.trim(), location: location.trim(), latitude: pin?.latitude, longitude: pin?.longitude, date, start, end, workerIds: selected, team: available.find(w => w.id === selected[0])?.team ?? shift.team }, scope);
    if (!result.ok) return setMessage(result.message);
    router.back(); } catch { setMessage('Could not save shifts. Try again.'); } finally { saving.current = false; setBusy(false); }
  };
  return <Screen back focused={false} title="Edit shift" subtitle="Update event details and your assigned crew.">
    {!!shift.seriesId && <Card style={{ marginBottom: 20 }}><Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 14 }}>Apply changes to</Text><ChoiceChips label="Edit recurring shifts" value={scope} onChange={value => setScope(value as EditScope)} options={[{ value: 'one', label: 'This shift' }, { value: 'future', label: 'This slot, from this date' }, { value: 'series', label: 'This slot, all dates' }]} /><Text style={{ color: C.muted, marginTop: 14 }}>{targetCount} <Text>editable shifts</Text></Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Recorded shifts are kept unchanged. Other daily time slots keep their own hours.</Text></Card>}
    <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 28 : 0, alignItems: 'flex-start' }}>
    <View style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : '100%', minWidth: 0 }}>
    <Section title="Event details" />
    <Field label="Shift / event name" value={title} onChangeText={setTitle} placeholder="e.g. Main stage setup" />
    <Field label="Site / project" value={site} onChangeText={setSite} placeholder="e.g. Northline Festival" />
    <Field label="Meeting point" value={location} onChangeText={setLocation} placeholder="e.g. East Gate" />
    <SitePinPicker pin={pin} onChange={setPin} site={site} location={location} />
    <ShiftDateTimeFields date={date} onDateChange={setDate} start={start} onStartChange={setStart} end={end} onEndChange={setEnd} dateLocked={locked || scope !== 'one'} />
    {locked && <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18 }}>Clock records exist for this shift, so its date and assigned crew are locked.</Text>}
    </View><View style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : '100%', minWidth: 0 }}>
    <Section title="Assigned workers" />
    <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>{available.map((w, i) => <Pressable key={w.id} disabled={locked && scope === 'one'} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(w.id), disabled: locked && scope === 'one' }} onPress={() => toggle(w.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: i ? 1 : 0, borderColor: C.line, opacity: locked ? .65 : 1 }}><Avatar worker={w} size={36} /><View style={{ flex: 1, marginLeft: 11 }}><Text style={{ color: C.ink, fontWeight: '500', fontSize: 13 }}>{w.name}</Text><Text style={{ color: C.muted, fontSize: 11 }}>{w.role} · {w.team}</Text></View><SelectionMark selected={selected.includes(w.id)} /></Pressable>)}</Card>
    {!!message && <Text style={{ color: C.red, marginBottom: 12 }}>{message}</Text>}
    <Button label={busy ? 'Saving…' : 'Save changes'} disabled={busy || !targetCount} onPress={() => void save()} />
    </View></View>
  </Screen>;
}
