import { router } from 'expo-router';
import { Download } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { csvRow, downloadCsv } from '../lib/csv';
import { durationMinutes, formatDay, localDate, shiftHasEnded, shiftHasOpenPunch, today } from '../lib/data';
import { useStore } from '../lib/store';
import { useLanguage } from '../lib/i18n';
import { Button, Empty, Screen } from '../ui/components';
import { ShiftCard } from '../ui/ShiftCard';
import { ContentGrid } from '../ui/ContentGrid';
import { CalendarView } from '../ui/CalendarView';
import { useTheme } from '../ui/theme';

export default function Schedule() {
  const C = useTheme().colors;
  const { t } = useLanguage();
  const { role, shifts, workers, punches, selectedWorkerId } = useStore();
  type Tab = 'today' | 'week' | 'month' | 'calendar' | 'history';
  const [filter, setFilter] = useState<Tab>('calendar');
  const mine = (s: typeof shifts[number]) => role === 'admin' || s.workerIds.includes(selectedWorkerId) || punches.some(p => p.shiftId === s.id && p.workerId === selectedWorkerId);
  const dayOffset = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localDate(d); };
  const lastDate = filter === 'today' ? dayOffset(0) : filter === 'week' ? dayOffset(6) : dayOffset(30);
  const isUpcoming = (s: typeof shifts[number]) => !s.archived && (!shiftHasEnded(s) || (s.date === today() && shiftHasOpenPunch(s.id, punches)));
  const filtered = shifts
    .filter(s => mine(s) && (filter === 'history'
      ? shiftHasEnded(s) && !(s.date === today() && shiftHasOpenPunch(s.id, punches)) && (!s.archived || punches.some(p => p.shiftId === s.id))
      : filter === 'calendar' ? !s.archived : isUpcoming(s) && s.date <= lastDate))
    .sort((a, b) => filter === 'history' ? b.date.localeCompare(a.date) || b.start.localeCompare(a.start) : a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const dayLabel = (date: string) => date === today() ? t('Today') : date === dayOffset(1) ? t('Tomorrow') : formatDay(date);
  const dayGroups = filter === 'history' ? [] : [...new Set(filtered.map(s => s.date))].map(date => ({ date, shifts: filtered.filter(s => s.date === date) }));
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
    <View style={{ flexDirection: 'row', backgroundColor: C.subtle, borderRadius: 14, padding: 4, marginBottom: 14 }}>
      {([['calendar', 'Calendar'], ['list', 'List']] as const).map(([key, label]) => { const on = (key === 'calendar') === (filter === 'calendar'); return <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setFilter(key === 'calendar' ? 'calendar' : filter === 'calendar' ? 'today' : filter)} style={{ flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.surface : 'transparent', borderWidth: on ? 1 : 0, borderColor: C.line }}><Text style={{ color: on ? C.green : C.muted, fontWeight: '600', fontSize: 14 }}>{t(label)}</Text></Pressable>; })}
    </View>
    {filter !== 'calendar' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      {(['today', 'week', 'month', 'history'] as const).map(item => <Pressable key={item} onPress={() => setFilter(item)} accessibilityRole="tab" accessibilityState={{ selected: filter === item }} style={{ backgroundColor: filter === item ? C.green : C.surface, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: filter === item ? C.green : C.line }}><Text style={{ color: filter === item ? C.onGreen : C.muted, fontWeight: '500', fontSize: 13 }}>{t(item === 'today' ? 'Today' : item === 'week' ? 'Week' : item === 'month' ? 'Month' : 'History')}</Text></Pressable>)}
    </View>}
    {filter !== 'calendar' && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 13 }}>
      <Text style={{ color: C.ink, fontSize: 16, fontWeight: '500' }}>{filtered.length} {t('Shifts').toLowerCase()}</Text>
      {filter === 'history' ? !!filtered.length && <Button label="Export CSV" small variant="outline" icon={<Download size={16} color={C.green} />} onPress={() => void exportHistory()} /> : null}
    </View>}
        {filter === 'calendar' ? <CalendarView shifts={filtered} /> : filter === 'history' ? (filtered.length ? <ContentGrid>{filtered.map(shift => <ShiftCard key={shift.id} shift={shift} history />)}</ContentGrid> : <Empty title="No shift history yet" detail="Finished shifts and their clock records will appear here." />)
      : dayGroups.length ? dayGroups.map(group => <View key={group.date} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6, marginBottom: 10 }}><Text style={{ color: C.ink, fontSize: 15, fontWeight: '600' }}>{dayLabel(group.date)}</Text><Text style={{ color: C.muted, fontSize: 12 }}>{group.shifts.length} {t('Shifts').toLowerCase()}</Text></View>
        <ContentGrid>{group.shifts.map(shift => <ShiftCard key={shift.id} shift={shift} compact />)}</ContentGrid>
      </View>) : <Empty title={filter === 'today' ? 'Nothing today' : filter === 'week' ? 'Nothing in the next 7 days' : 'Nothing in the next 30 days'} detail="New assignments will appear here when they're scheduled." />}
  </Screen>;
}
