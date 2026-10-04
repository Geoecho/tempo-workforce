import { copyPreviousWeek, validateRoster, ScheduleTemplate } from '../lib/planning';
import { ShiftSlot } from '../lib/shift-slots';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text, TextInput } from '../ui/LocalizedText';
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
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 960;
  const { play } = useFeedback();
  const { addShifts, saveSite, saveTemplate, sites = [], templates = [], workers, shifts, role } = useStore();
  const [title, setTitle] = useState('');
  const [site, setSite] = useState('');
  const [location, setLocation] = useState('');
  const [pin, setPin] = useState<SitePin | null>(null);
  const params = useLocalSearchParams<{ date?: string; worker?: string }>();
  const initial = typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today();
  const [date, setDate] = useState(initial);
  const [until, setUntil] = useState(() => defaultRepeatUntil(initial));
  const [repeat, setRepeat] = useState<ShiftRepeat>('once');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [requiredWorkers, setRequiredWorkers] = useState(1);
  const [selected, setSelected] = useState<string[]>(params.worker ? [params.worker] : []);
  const [activeSlot, setActiveSlot] = useState('primary');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [showWeekCopy, setShowWeekCopy] = useState(false);
  const [message, setMessage] = useState('');
  const [extraSlots, setExtraSlots] = useState<ShiftSlot[]>([]);
  const slots: ShiftSlot[] = [{ id: 'primary', start, end, requiredWorkers, workerIds: selected }, ...extraSlots];
  const updateSlot = (id: string, changes: Partial<ShiftSlot>) => setExtraSlots(current => current.map(slot => slot.id === id ? { ...slot, ...changes } : slot));
  const [workerQuery, setWorkerQuery] = useState('');
  const weekDrafts = copyPreviousWeek(shifts, date, 'preview', params.worker);
  const copyWeek = async () => {
    if (saving.current) return;
    const drafts = copyPreviousWeek(shifts, date, uid(), params.worker);
    const error = validateRoster(drafts.map((shift, index) => ({ ...shift, id: `copy-preview-${index}`, status: 'upcoming' as const })), workers, shifts);
    if (error) return setMessage(error);
    if (!drafts.length) return;
    saving.current = true; setBusy(true);
    try { const result = await addShifts(drafts); if (!result.ok) return setMessage(result.message); router.replace('/schedule'); } catch { setMessage('Could not save shifts. Try again.'); } finally { saving.current = false; setBusy(false); }
  };
  const dates = repeatShiftDates(date, until, repeat);
  const setSlotPeople = (slot: ShiftSlot, ids: string[]) => { play('select'); if (slot.id === 'primary') setSelected(ids); else updateSlot(slot.id, { workerIds: ids }); };
  const changeDate = (value: string) => {
    setDate(value);
    setUntil(defaultRepeatUntil(value));
  };
  const save = async () => {
    if (saving.current) return;
    if (!title.trim() || !site.trim() || !location.trim()) return setMessage('Fill in the title, site, and location.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00`).getTime()) || localDate(new Date(`${date}T12:00:00`)) !== date) return setMessage('Choose a valid start date.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end === start) return setMessage('Choose different valid start and end times.');

    const maxRepeatDate = new Date(`${date}T12:00:00`);
    maxRepeatDate.setDate(maxRepeatDate.getDate() + 30);
    if (repeat !== 'once' && (until < date || until > localDate(maxRepeatDate))) return setMessage('Choose a repeat end date within 31 days of the first shift.');
    if (!dates.length) return setMessage('No workdays fall in this date range.');
    const seriesId = dates.length * slots.length > 1 ? uid() : undefined;
    const drafts = dates.flatMap(day => slots.map(slot => ({ title: title.trim(), site: site.trim(), location: location.trim(), ...(pin ?? {}), seriesId, slotId: slot.id, requiredWorkers: slot.requiredWorkers ?? 1, date: day, start: slot.start, end: slot.end, team: workers.find(w => w.id === slot.workerIds[0])?.team ?? 'General', workerIds: slot.workerIds })));
    const slotError = validateRoster(drafts.map((shift, i) => ({ ...shift, id: `draft-${i}`, status: 'upcoming' as const })), workers, shifts);
    if (slotError) return setMessage(slotError);
    saving.current = true; setBusy(true);
    try { const result = await addShifts(drafts); if (!result.ok) return setMessage(result.message); router.replace('/schedule'); } catch { setMessage('Could not save shifts. Try again.'); } finally { saving.current = false; setBusy(false); }
  };
  const saveReusable = async (kind: 'site' | 'template') => {
    if (saving.current) return;
    if (!site.trim() || !location.trim() || kind === 'template' && !title.trim()) return setMessage('Fill in the title, site, and location.');
    if (kind === 'template' && slots.some(slot => !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end) || slot.start === slot.end)) return setMessage('Choose different valid start and end times.');
    saving.current = true; setBusy(true);
    try {
      const result = kind === 'site' ? await saveSite({ id: uid(), name: site.trim(), location: location.trim(), ...pin }) : await saveTemplate({ id: uid(), name: `${site.trim()} · ${title.trim()}`, title: title.trim(), site: site.trim(), location: location.trim(), ...pin, slots: slots.map(({ start, end, workerIds, requiredWorkers }) => ({ start, end, workerIds, requiredWorkers })) });
      setMessage(result.ok ? kind === 'site' ? 'Site saved for your workspace.' : 'Template saved for your workspace.' : result.message);
    } catch { setMessage('Could not save changes. Try again.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const applyTemplate = (template: ScheduleTemplate) => {
    setTitle(template.title); setSite(template.site); setLocation(template.location);
    setPin(template.latitude !== undefined && template.longitude !== undefined ? { latitude: template.latitude, longitude: template.longitude } : null);
    const valid = template.slots.map(slot => ({ ...slot, id: uid(), workerIds: params.worker ? [params.worker] : slot.workerIds.filter(id => workers.some(worker => worker.id === id && !worker.archived)) }));
    const first = valid[0]; if (!first) return;
    setStart(first.start); setEnd(first.end); setSelected(first.workerIds); setRequiredWorkers(first.requiredWorkers ?? 1); setExtraSlots(valid.slice(1)); setActiveSlot('primary'); setMessage('Template loaded. Review the dates and workers.');
  };

  const people = workers.filter(w => !w.archived);
  const matchingPeople = people.filter(w => `${w.name} ${w.role} ${w.team}`.toLowerCase().includes(workerQuery.trim().toLowerCase()));
  const teamList = [...new Set(people.map(w => w.team).filter(Boolean))];
  const selectTeam = (slot: ShiftSlot, team: string | null) => { const ids = people.filter(w => team === null || w.team === team).map(w => w.id); setSlotPeople(slot, ids.every(id => slot.workerIds.includes(id)) ? slot.workerIds.filter(id => !ids.includes(id)) : [...new Set([...slot.workerIds, ...ids])]); };
  const workerPicker = (slot: ShiftSlot) => <>
    <Field label="People needed" keyboardType="number-pad" value={String(slot.requiredWorkers ?? 1)} onChangeText={value => { const number = Math.max(1, Math.min(100, Number(value.replace(/\D/g, '')) || 1)); if (slot.id === 'primary') setRequiredWorkers(number); else updateSlot(slot.id, { requiredWorkers: number }); }} placeholder="1" />
    {slot.workerIds.length < (slot.requiredWorkers ?? 1) && <Text style={{ color: C.warningText, marginBottom: 14 }}>{(slot.requiredWorkers ?? 1) - slot.workerIds.length} <Text>more people needed</Text></Text>}
    <TextInput accessibilityLabel="Search people or teams" placeholder="Search people or teams" value={workerQuery} onChangeText={setWorkerQuery} style={{ minHeight: 48, fontSize: 16, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 14, marginBottom: 12, backgroundColor: C.surface }} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      {[null, ...teamList].map(team => { const ids = people.filter(w => team === null || w.team === team).map(w => w.id); const on = ids.length > 0 && ids.every(id => slot.workerIds.includes(id)); return <Pressable key={team ?? 'all'} accessibilityRole="button" onPress={() => selectTeam(slot, team)} style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: on ? C.green : C.line, backgroundColor: on ? C.mint : C.surface }}><Text style={{ color: on ? C.green : C.muted, fontSize: 12, fontWeight: '500' }}>{team ?? 'Everyone'}</Text></Pressable>; })}
    </View>
    <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>{matchingPeople.map((w, i) => <Pressable key={w.id} accessibilityRole="checkbox" accessibilityState={{ checked: slot.workerIds.includes(w.id) }} onPress={() => setSlotPeople(slot, slot.workerIds.includes(w.id) ? slot.workerIds.filter(id => id !== w.id) : [...slot.workerIds, w.id])} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: i ? 1 : 0, borderColor: C.line, backgroundColor: slot.workerIds.includes(w.id) ? C.mint : 'transparent' }}><Avatar worker={w} size={36} /><View style={{ flex: 1, marginLeft: 11 }}><Text style={{ color: C.ink, fontWeight: '500', fontSize: 14 }}>{w.name}</Text><Text style={{ color: C.muted, fontSize: 13 }}>{w.role} · {w.team}</Text></View><SelectionMark selected={slot.workerIds.includes(w.id)} /></Pressable>)}{!matchingPeople.length && <Text style={{ color: C.muted, padding: 16 }}>{people.length ? 'No people or teams match your search.' : 'Add people on the Team tab first.'}</Text>}</Card>
  </>;
  const stepTitle = (n: number, label: string) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 12 }}><View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.onGreen, fontSize: 12, fontWeight: '600' }}>{n}</Text></View><Text style={{ color: C.ink, fontSize: 16, fontWeight: '600' }}>{label}</Text></View>;
  if (role !== 'admin') return <Screen back title="Admin only"><Text>This action requires an admin account.</Text></Screen>;
  return <Screen back focused={false} title="Create a shift" subtitle="Schedule one day or a month at the same place.">
    {!!templates.length && <Card style={{ marginBottom: 20 }}><Text style={{ color: C.ink, fontWeight: '600', marginBottom: 12 }}>Start from a template</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{templates.map(template => <Button key={template.id} label={template.name} small variant="outline" onPress={() => applyTemplate(template)} />)}</View></Card>}
    {!!weekDrafts.length && <Card style={{ marginBottom: 20 }}><Button label="Copy previous week's shifts" small variant="outline" onPress={() => setShowWeekCopy(value => !value)} />{showWeekCopy && <View style={{ gap: 12, marginTop: 16 }}><Text style={{ color: C.muted, lineHeight: 20 }}>Copies the previous seven days into the week starting on your selected date. Assignments are checked again before saving.</Text>{weekDrafts.slice(0, 5).map((shift, index) => <Text key={index} style={{ color: C.ink }}>{shift.site} · {shift.date} · {shift.start}–{shift.end}</Text>)}<Text style={{ color: C.muted }}>{weekDrafts.length} <Text>shifts to copy</Text></Text><Button disabled={busy} label={busy ? 'Saving…' : 'Create copied shifts'} onPress={() => void copyWeek()} /></View>}</Card>}
    <View style={{ flexDirection: desktop ? 'row' : 'column', alignItems: 'flex-start', gap: desktop ? 28 : 0 }}>
    <View style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : '100%', minWidth: 0 }}>
    {stepTitle(1, 'Details')}
    <Card style={{ paddingBottom: 4, marginBottom: 20 }}>
      {!!sites.length && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>{sites.map(item => <Button key={item.id} label={item.name} small variant="outline" onPress={() => { setSite(item.name); setLocation(item.location); setPin(item.latitude !== undefined && item.longitude !== undefined ? { latitude: item.latitude, longitude: item.longitude } : null); }} />)}</View>}
      <Field label="Shift name" value={title} onChangeText={setTitle} placeholder="e.g. Main stage setup" />
      <Field label="Site / project" value={site} onChangeText={setSite} placeholder="e.g. Northline Festival" />
      <Field label="Meeting point" value={location} onChangeText={setLocation} placeholder="e.g. East Gate" />
      <SitePinPicker pin={pin} onChange={setPin} site={site} location={location} />
      <View style={{ marginBottom: 20 }}><Button label="Save site for reuse" small variant="outline" disabled={busy} onPress={() => void saveReusable('site')} /></View>
    </Card>
    {stepTitle(2, 'When')}
    <Card style={{ marginBottom: 20 }}>
      <ShiftDateTimeFields showTimes={false} date={date} onDateChange={changeDate} start={start} onStartChange={setStart} end={end} onEndChange={setEnd} until={repeat === 'once' ? undefined : until} onUntilChange={repeat === 'once' ? undefined : setUntil} />
      <Text style={{ color: C.ink, fontWeight: '500', fontSize: 14, marginBottom: 8 }}>Repeat</Text>
      <View style={{ flexDirection: 'row', backgroundColor: C.subtle, borderRadius: 13, padding: 4, gap: 4 }}>{([['once', 'One day'], ['daily', 'Every day'], ['weekdays', 'Weekdays']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: repeat === value }} onPress={() => { play('select'); setRepeat(value); setMessage(''); }} style={{ flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: repeat === value ? C.surface : 'transparent', borderWidth: repeat === value ? 1 : 0, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: repeat === value ? C.green : C.muted, fontWeight: '600', fontSize: 12 }}>{label}</Text></Pressable>)}</View>
      {repeat !== 'once' && <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 10 }}>{dates.length} separate daily shifts will be created. Each day has its own QR code and clock history.</Text>}
    </Card>
    </View>
    <View style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : '100%', minWidth: 0 }}>
    {stepTitle(3, 'Hours & workers')}
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>{slots.map(slot => <Pressable key={slot.id} accessibilityRole="tab" accessibilityState={{ selected: activeSlot === slot.id }} onPress={() => setActiveSlot(slot.id)} style={{ padding: 12, backgroundColor: activeSlot === slot.id ? C.mint : C.surface, borderWidth: 1, borderColor: activeSlot === slot.id ? C.green : C.line, borderRadius: 12 }}><Text style={{ color: C.green, fontWeight: '600' }}>{slot.start}–{slot.end}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{slot.workerIds.length} <Text>assigned</Text></Text></Pressable>)}</View>
    {activeSlot === 'primary' && <>
    <ShiftDateTimeFields showDate={false} date={date} onDateChange={() => {}} start={start} onStartChange={setStart} end={end} onEndChange={setEnd} />
    {end < start && <Text style={{ color: C.green, marginBottom: 12 }}>Ends the next day</Text>}
    {workerPicker(slots[0])}
    </>}
    {extraSlots.filter(slot => slot.id === activeSlot).map(slot => <Card key={slot.id} style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}><Text style={{ color: C.ink, fontSize: 16, fontWeight: '600' }}><Text>Time slot</Text> {extraSlots.findIndex(item => item.id === slot.id) + 2}</Text><Button label="Remove slot" small variant="outline" onPress={() => { setExtraSlots(current => current.filter(item => item.id !== slot.id)); setActiveSlot('primary'); }} /></View>
      <ShiftDateTimeFields showDate={false} date={date} onDateChange={changeDate} dateLocked start={slot.start} onStartChange={value => updateSlot(slot.id, { start: value })} end={slot.end} onEndChange={value => updateSlot(slot.id, { end: value })} />
      {slot.end < slot.start && <Text style={{ color: C.green, marginBottom: 12 }}>Ends the next day</Text>}
      <Text style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Assign workers for these hours</Text>
      {workerPicker(slot)}
    </Card>)}
    <View style={{ marginBottom: 20 }}><Button label="Add another time slot" variant="outline" onPress={() => { const id = uid(); const from = extraSlots.at(-1)?.end ?? end; const hours = (Number(from.slice(0, 2)) + 8) % 24; setExtraSlots(current => [...current, { id, start: from, end: `${String(hours).padStart(2, '0')}:${from.slice(3)}`, workerIds: params.worker ? [params.worker] : [] }]); setActiveSlot(id); }} /></View>
    <Card style={{ backgroundColor: C.mint, borderColor: C.line, marginBottom: 14 }}><Text style={{ color: C.green, fontSize: 14, fontWeight: '500' }}>{title.trim() || 'Untitled shift'}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{dates.length > 1 ? `${dates.length} days from ${date}` : date} · {slots.length} <Text>time slots per day</Text></Text></Card>

    <View style={{ gap: 8 }}><Text style={{ color: C.muted, fontSize: 14 }}>{new Set(slots.flatMap(slot => slot.workerIds)).size} <Text>people selected</Text> · {dates.length} <Text>days</Text></Text>{!!message && <Text accessibilityRole="alert" style={{ color: message.includes('saved') || message.includes('loaded') ? C.green : C.red, fontSize: 14 }}>{message}</Text>}<Button disabled={busy} label={busy ? 'Saving…' : dates.length * slots.length > 1 ? `Create ${dates.length * slots.length} shifts` : 'Create shift'} onPress={() => void save()} /></View>
    <View style={{ marginTop: 16 }}><Button label="Save as template" variant="outline" disabled={busy} onPress={() => void saveReusable('template')} /></View>
    </View></View>
  </Screen>;
}
