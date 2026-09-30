import { router } from 'expo-router';
import { Download, Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Share, useWindowDimensions, View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { csvRow, downloadCsv } from '../lib/csv';
import { durationMinutes, shiftHasEnded, shiftHasOpenPunch, today } from '../lib/data';
import { useStore } from '../lib/store';
import { useLanguage } from '../lib/i18n';
import { Button, Empty, Screen } from '../ui/components';
import { ShiftCard } from '../ui/ShiftCard';
import { C } from '../ui/theme';

export default function Schedule() {
  const { t } = useLanguage();
  const { role, shifts, workers, punches, selectedWorkerId } = useStore();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 960;
  const [filter, setFilter] = useState<'upcoming' | 'history'>('upcoming');
  const filtered = shifts
    .filter(s => (role === 'admin' || s.workerIds.includes(selectedWorkerId) || punches.some(p => p.shiftId === s.id && p.workerId === selectedWorkerId))
      && (filter === 'history' ? shiftHasEnded(s) && !(s.date === today() && shiftHasOpenPunch(s.id, punches)) && (!s.archived || punches.some(p => p.shiftId === s.id)) : !s.archived && (!shiftHasEnded(s) || (s.date === today() && shiftHasOpenPunch(s.id, punches)))))
    .sort((a, b) => filter === 'history' ? b.date.localeCompare(a.date) || b.start.localeCompare(a.start) : a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const exportHistory = async () => {
    const lines = [csvRow(['date', 'shift', 'site', 'location', 'scheduled_start', 'scheduled_end', 'worker', 'first_check_in', 'last_check_out', 'recorded_minutes', 'status'])];
    for (const shift of filtered) {
      const ids = [...new Set([...shift.workerIds, ...punches.filter(p => p.shiftId === shift.id).map(p => p.workerId)])];
      for (const workerId of ids) {
        if (role === 'worker' && workerId !== selectedWorkerId) continue;
        const worker = workers.find(item => item.id === workerId);
        const events = punches.filter(p => p.shiftId === shift.id && p.workerId === workerId).sort((a, b) => a.at.localeCompare(b.at));
        lines.push(csvRow([shift.date, shift.title, shift.site, shift.location, shift.start, shift.end, worker?.name ?? workerId, events.find(p => p.type === 'in')?.at ?? '', [...events].reverse().find(p => p.type === 'out')?.at ?? '', durationMinutes(punches, shift.id, workerId), events.at(-1)?.type === 'in' ? 'on site' : events.length ? 'checked out' : 'not arrived']));
      }
      if (!ids.length) lines.push(csvRow([shift.date, shift.title, shift.site, shift.location, shift.start, shift.end, '', '', '', 0, 'unassigned']));
    }
    const csv = lines.join('\n');
    if (Platform.OS === 'web') downloadCsv('tempo-shift-history.csv', csv);
    else await Share.share({ title: 'Tempo shift history', message: csv });
  };

  return <Screen
    title={role === 'admin' ? 'Shifts' : 'My shifts'}
    subtitle={role === 'admin' ? 'Plan work and review completed shifts.' : 'Your next shifts and recorded history.'}
  >
    <View style={{ flexDirection: 'row', gap: 9, marginBottom: 23 }}>
      {(['upcoming', 'history'] as const).map(item => <Pressable
        key={item}
        onPress={() => setFilter(item)}
        accessibilityRole="tab"
        accessibilityState={{ selected: filter === item }}
        style={{ backgroundColor: filter === item ? C.green : C.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: filter === item ? C.green : C.line }}
      ><Text style={{ color: filter === item ? '#fff' : C.muted, fontWeight: '700', fontSize: 13 }}>{t(item === 'upcoming' ? 'Upcoming' : 'History')}</Text></Pressable>)}
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
      <Text style={{ color: C.ink, fontSize: 16, fontWeight: '700' }}>{filtered.length} {t('Shifts').toLowerCase()}</Text>
      {filter === 'history' ? !!filtered.length && <Button label="Export CSV" small variant="outline" icon={<Download size={16} color={C.green} />} onPress={() => void exportHistory()} /> : role === 'admin' && <Button label="New shift" small icon={<Plus size={16} color="#fff" />} onPress={() => router.push('/new-shift')} />}
    </View>
    {filtered.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {filtered.map(s => <View key={s.id} style={{ width: desktop ? '49%' : '100%' }}><ShiftCard shift={s} history={filter === 'history'} /></View>)}
    </View> : <Empty title={filter === 'history' ? 'No shift history yet' : 'Nothing on the calendar'} detail={filter === 'history' ? 'Finished shifts and their clock records will appear here.' : "New assignments will appear here when they're scheduled."} />}
  </Screen>;
}
