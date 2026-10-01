import { router } from 'expo-router';
import { ChevronDown, ChevronRight, Download, Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Share, useWindowDimensions, View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { csvRow, downloadCsv } from '../lib/csv';
import { durationMinutes, formatDay, shiftHasEnded, shiftHasOpenPunch, today } from '../lib/data';
import { groupUpcomingShifts } from '../lib/shift-groups';
import { useStore } from '../lib/store';
import { useLanguage } from '../lib/i18n';
import { Button, Card, Empty, Screen } from '../ui/components';
import { ShiftCard } from '../ui/ShiftCard';
import { useTheme } from '../ui/theme';

export default function Schedule() {
  const C = useTheme().colors;
  const { t } = useLanguage();
  const { role, shifts, workers, punches, selectedWorkerId } = useStore();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 960;
  const [filter, setFilter] = useState<'upcoming' | 'history'>('upcoming');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [shown, setShown] = useState<Record<string, number>>({});
  const filtered = shifts
    .filter(s => (role === 'admin' || s.workerIds.includes(selectedWorkerId) || punches.some(p => p.shiftId === s.id && p.workerId === selectedWorkerId))
      && (filter === 'history' ? shiftHasEnded(s) && !(s.date === today() && shiftHasOpenPunch(s.id, punches)) && (!s.archived || punches.some(p => p.shiftId === s.id)) : !s.archived && (!shiftHasEnded(s) || (s.date === today() && shiftHasOpenPunch(s.id, punches)))))
    .sort((a, b) => filter === 'history' ? b.date.localeCompare(a.date) || b.start.localeCompare(a.start) : a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const groups = filter === 'upcoming' ? groupUpcomingShifts(filtered) : filtered.map(shift => ({ key: shift.id, shifts: [shift] }));
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
      ><Text style={{ color: filter === item ? C.onGreen : C.muted, fontWeight: '500', fontSize: 13 }}>{t(item === 'upcoming' ? 'Upcoming' : 'History')}</Text></Pressable>)}
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
      <Text style={{ color: C.ink, fontSize: 16, fontWeight: '500' }}>{filter === 'upcoming' && groups.length < filtered.length ? `${groups.length} entries · ` : ''}{filtered.length} {t('Shifts').toLowerCase()}</Text>
      {filter === 'history' ? !!filtered.length && <Button label="Export CSV" small variant="outline" icon={<Download size={16} color={C.green} />} onPress={() => void exportHistory()} /> : role === 'admin' && <Button label="New shift" small icon={<Plus size={16} color={C.onGreen} />} onPress={() => router.push('/new-shift')} />}
    </View>
    {filtered.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {groups.map(group => <View key={group.key} style={{ width: desktop ? '49%' : '100%' }}>
        {group.shifts.length < 3 ? group.shifts.map(shift => <ShiftCard key={shift.id} shift={shift} history={filter === 'history'} />) : <>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded.includes(group.key) }} onPress={() => setExpanded(current => current.includes(group.key) ? current.filter(key => key !== group.key) : [...current, group.key])}>
            <Card style={{ marginBottom: 10, padding: 18 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontSize: 18, fontWeight: '500' }}>{group.shifts[0].title}</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{group.shifts[0].site} · {group.shifts[0].start}–{group.shifts[0].end}</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>{formatDay(group.shifts[0].date)} – {formatDay(group.shifts.at(-1)!.date)} · {group.shifts.length} days</Text>
            </View>{expanded.includes(group.key) ? <ChevronDown size={18} color={C.green} /> : <ChevronRight size={18} color={C.green} />}</View></Card>
          </Pressable>
          {expanded.includes(group.key) && <>
            {group.shifts.slice(0, shown[group.key] ?? 7).map(shift => <ShiftCard key={shift.id} shift={shift} compact />)}
            {group.shifts.length > (shown[group.key] ?? 7) && <Pressable accessibilityRole="button" onPress={() => setShown(current => ({ ...current, [group.key]: (current[group.key] ?? 7) + 7 }))} style={{ alignItems: 'center', paddingVertical: 13, marginBottom: 12 }}><Text style={{ color: C.green, fontSize: 13, fontWeight: '500' }}>Show next {Math.min(7, group.shifts.length - (shown[group.key] ?? 7))} days</Text></Pressable>}
          </>}
        </>}
      </View>)}
    </View> : <Empty title={filter === 'history' ? 'No shift history yet' : 'Nothing on the calendar'} detail={filter === 'history' ? 'Finished shifts and their clock records will appear here.' : "New assignments will appear here when they're scheduled."} />}
  </Screen>;
}
