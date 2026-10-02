import { Camera, Check, Plus, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { Pressable } from './LocalizedPressable';
import { Text, TextInput } from './LocalizedText';
import { formatDay, formatMoney, Currency } from '../lib/data';
import { RoleTag, Task, useExtras } from '../lib/extras';
import { takeProofPhoto } from '../lib/proof-photo';
import { Card, Section } from './components';
import { useTheme } from './theme';

export function RoleChip({ role, currency }: { role: RoleTag; currency?: Currency }) {
  return <View style={{ backgroundColor: role.color, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 }}>
    <Text style={{ color: '#202C27', fontSize: 11, fontWeight: '600' }}>{role.name}{role.rate && currency ? ` · ${formatMoney(Math.round(role.rate * 100), currency)}/h` : ''}</Text>
  </View>;
}
export function RoleChips({ roles, currency }: { roles: RoleTag[]; currency?: Currency }) {
  if (!roles.length) return null;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{roles.map(r => <RoleChip key={r.id} role={r} currency={currency} />)}</View>;
}

/** Select role tags, or create a new one inline. */
export function RolePicker({ selected, onChange, currency }: { selected: string[]; onChange: (ids: string[]) => void; currency?: Currency }) {
  const C = useTheme().colors;
  const { roles, addRole } = useExtras();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(''); const [details, setDetails] = useState(''); const [rate, setRate] = useState('');
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const create = () => {
    if (!name.trim()) return;
    const r = Number(rate.replace(',', '.'));
    const id = addRole(name, details, Number.isFinite(r) && r > 0 ? r : undefined);
    onChange([...selected, id]);
    setName(''); setDetails(''); setRate(''); setCreating(false);
  };
  const input = { borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 11, color: C.ink, backgroundColor: C.surface, fontSize: 14, marginTop: 8 } as const;
  return <View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {roles.map(r => { const on = selected.includes(r.id); return <Pressable key={r.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => toggle(r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: on ? r.color : C.surface, borderWidth: 1, borderColor: on ? r.color : C.line, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 }}>
        {on && <Check size={13} color="#202C27" />}<Text style={{ color: on ? '#202C27' : C.muted, fontSize: 12, fontWeight: '500' }}>{r.name}{r.rate && currency ? ` · ${formatMoney(Math.round(r.rate * 100), currency)}/h` : ''}</Text>
      </Pressable>; })}
      <Pressable accessibilityRole="button" onPress={() => setCreating(c => !c)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.green, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 }}><Plus size={13} color={C.green} /><Text style={{ color: C.green, fontSize: 12, fontWeight: '500' }}>New tag</Text></Pressable>
    </View>
    {selected.map(id => roles.find(r => r.id === id)).filter((r): r is RoleTag => !!r && !!r.details).map(r => <Text key={r.id} style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>{r.name}: {r.details}</Text>)}
    {creating && <Card style={{ marginTop: 12 }}>
      <TextInput accessibilityLabel="Tag name" value={name} onChangeText={setName} placeholder="Tag name, e.g. Bartender" placeholderTextColor={C.placeholder} style={{ ...input, marginTop: 0 }} />
      <TextInput accessibilityLabel="Tag details" value={details} onChangeText={setDetails} placeholder="Details: duties, dress code, certifications" placeholderTextColor={C.placeholder} multiline style={{ ...input, minHeight: 60 }} />
      <TextInput accessibilityLabel="Tag hourly rate" value={rate} onChangeText={setRate} placeholder="Hourly rate (optional)" placeholderTextColor={C.placeholder} keyboardType="decimal-pad" style={input} />
      <Pressable accessibilityRole="button" onPress={create} style={{ backgroundColor: C.green, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 }}><Text style={{ color: C.onGreen, fontWeight: '500' }}>Create tag</Text></Pressable>
    </Card>}
  </View>;
}

function TaskRow({ task, canComplete, canManage }: { task: Task; canComplete: boolean; canManage: boolean }) {
  const C = useTheme().colors;
  const { completeTask, reopenTask, removeTask } = useExtras();
  const [error, setError] = useState('');
  const done = !!task.doneAt;
  const finish = async () => {
    try { const uri = await takeProofPhoto(); if (uri) completeTask(task.id, uri); else setError('A photo is required to finish this task.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not attach the photo.'); }
  };
  return <View style={{ padding: 14, gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.green, backgroundColor: done ? C.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{done && <Check size={13} color={C.onGreen} />}</View>
      <View style={{ flex: 1 }}><Text style={{ color: C.ink, fontSize: 14, fontWeight: '500', textDecorationLine: done ? 'line-through' : 'none' }}>{task.title}</Text>{done && <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Done {formatDay(task.doneAt!.slice(0, 10))} · photo attached</Text>}</View>
      {canManage && <Pressable accessibilityLabel="Delete task" onPress={() => removeTask(task.id)} style={{ padding: 6 }}><Trash2 size={16} color={C.muted} /></Pressable>}
    </View>
    {done && !!task.proofUri && <Image source={{ uri: task.proofUri }} style={{ width: '100%', maxWidth: 320, height: 180, borderRadius: 12, backgroundColor: C.subtle }} resizeMode="cover" />}
    {!done && canComplete && <Pressable accessibilityRole="button" onPress={() => void finish()} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.green, borderRadius: 12, minHeight: 42 }}><Camera size={16} color={C.onGreen} /><Text style={{ color: C.onGreen, fontWeight: '500', fontSize: 13 }}>Take photo to finish</Text></Pressable>}
    {done && canComplete && <Pressable onPress={() => reopenTask(task.id)}><Text style={{ color: C.muted, fontSize: 12 }}>Reopen task</Text></Pressable>}
    {!!error && <Text style={{ color: C.red, fontSize: 12 }}>{error}</Text>}
  </View>;
}

/** Tasks for one person. Admin adds and removes; the worker finishes with a photo. */
export function TaskList({ workerId, admin }: { workerId: string; admin: boolean }) {
  const C = useTheme().colors;
  const { tasks, addTask } = useExtras();
  const [title, setTitle] = useState('');
  const mine = tasks.filter(t => t.workerId === workerId).sort((a, b) => Number(!!a.doneAt) - Number(!!b.doneAt) || b.createdAt.localeCompare(a.createdAt));
  const add = () => { if (!title.trim()) return; addTask(workerId, title); setTitle(''); };
  return <View>
    {admin && <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
      <TextInput accessibilityLabel="New task" value={title} onChangeText={setTitle} onSubmitEditing={add} placeholder="Add a task for this person" placeholderTextColor={C.placeholder} style={{ flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 11, paddingHorizontal: 12, color: C.ink, backgroundColor: C.surface, fontSize: 14, minHeight: 44 }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Add task" onPress={add} style={{ width: 44, borderRadius: 11, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}><Plus size={18} color={C.onGreen} /></Pressable>
    </View>}
    {mine.length ? <Card style={{ padding: 0, overflow: 'hidden' }}>{mine.map((t, i) => <View key={t.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}><TaskRow task={t} canComplete={!admin} canManage={admin} /></View>)}</Card> : <Card><Text style={{ color: C.muted, fontSize: 13 }}>{admin ? 'No tasks yet.' : 'No tasks assigned to you.'}</Text></Card>}
  </View>;
}

/** Roles for everyone on one shift. Admins can override a person's tags and details for just this event. */
export function ShiftRoles({ shiftId, workerIds, workers, admin, currency, viewerId }: { shiftId: string; workerIds: string[]; workers: { id: string; name: string }[]; admin: boolean; currency: Currency; viewerId?: string }) {
  const C = useTheme().colors;
  const { assignment, workerRoles, setOverride } = useExtras();
  const [editing, setEditing] = useState<string | null>(null);
  const ids = admin ? workerIds : workerIds.filter(id => id === viewerId);
  const rows = ids.map(id => ({ id, name: workers.find(w => w.id === id)?.name ?? 'Team member', a: assignment(shiftId, id) })).filter(r => admin || r.a.roles.length || r.a.details);
  if (!rows.length) return null;
  return <><Section title="Roles for this shift" /><Card style={{ padding: 0, overflow: 'hidden' }}>{rows.map((r, i) => <View key={r.id} style={{ padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line, gap: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ flex: 1, color: C.ink, fontWeight: '500', fontSize: 14 }}>{r.name}{r.a.overridden ? '  · changed for this shift' : ''}</Text>
      {admin && <Pressable accessibilityRole="button" onPress={() => setEditing(editing === r.id ? null : r.id)}><Text style={{ color: C.green, fontSize: 12, fontWeight: '500' }}>{editing === r.id ? 'Done' : 'Edit'}</Text></Pressable>}
    </View>
    {r.a.roles.length ? <RoleChips roles={r.a.roles} currency={currency} /> : <Text style={{ color: C.muted, fontSize: 12 }}>No role tags</Text>}
    {!!r.a.details && <Text style={{ color: C.muted, fontSize: 12 }}>{r.a.details}</Text>}
    {r.a.roles.filter(x => x.details).map(x => <Text key={x.id} style={{ color: C.muted, fontSize: 12 }}>{x.name}: {x.details}</Text>)}
    {admin && editing === r.id && <View style={{ gap: 10, marginTop: 4 }}>
      <RolePicker selected={r.a.roles.map(x => x.id)} currency={currency} onChange={roleIds => setOverride(shiftId, r.id, { roleIds, details: r.a.details })} />
      <TextInput accessibilityLabel="Notes for this shift" value={r.a.details} onChangeText={details => setOverride(shiftId, r.id, { roleIds: r.a.roles.map(x => x.id), details })} placeholder="Notes for this shift only" placeholderTextColor={C.placeholder} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 11, color: C.ink, backgroundColor: C.surface, fontSize: 14 }} />
      {r.a.overridden && <Pressable accessibilityRole="button" onPress={() => { setOverride(shiftId, r.id, null); }}><Text style={{ color: C.muted, fontSize: 12 }}>Reset to {(workerRoles[r.id] ?? []).length} default tag(s)</Text></Pressable>}
    </View>}
  </View>)}</Card></>;
}
