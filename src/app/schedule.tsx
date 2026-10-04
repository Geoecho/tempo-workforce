import { InputFocusRing } from '../ui/InputFocusRing';
import { Disclosure } from '../ui/Disclosure';
import { ScheduleTabs, ScheduleContent } from '../ui/ScheduleTabs';
import { router, useLocalSearchParams } from 'expo-router';
import { Download, LayoutGrid, List, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Platform, Share, useWindowDimensions, View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text, TextInput } from '../ui/LocalizedText';
import { csvRow, downloadCsv } from '../lib/csv';
import { durationMinutes, formatDay, localDate, shiftHasEnded, shiftHasOpenPunch, today } from '../lib/data';
import { useStore } from '../lib/store';
import { useLanguage } from '../lib/i18n';
import { Button, Empty, Screen } from '../ui/components';
import { ShiftCard } from '../ui/ShiftCard';
import { ContentGrid } from '../ui/ContentGrid';
import { CalendarView } from '../ui/CalendarView';
import { ChoiceChips } from '../ui/ChoiceChips';
import { useTheme } from '../ui/theme';
import { useNow } from '../lib/use-now';
import { confirmRemoval } from '../lib/confirm';

export default function Schedule() {
  const C = useTheme().colors;
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 960;
  const { t, language } = useLanguage();
  const { role, shifts, workers, punches, selectedWorkerId, removeShifts, restoreShift } = useStore();
  const [searchFocused, setSearchFocused] = useState(false);
  const [groupBy, setGroupBy] = useState<'date' | 'site'>('date');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showRemoved, setShowRemoved] = useState(false);
  const [removedLimit, setRemovedLimit] = useState(5);
  const removed = shifts.filter(shift => shift.archived).sort((a, b) => b.date.localeCompare(a.date));
  type Tab = 'today' | 'week' | 'month' | 'calendar' | 'history';
  const { view } = useLocalSearchParams<{ view?: string }>();
  const now = useNow();
  const [filter, setFilter] = useState<Tab>(view === 'today' ? 'today' : 'week');
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState('');
  const [site, setSite] = useState('');
  const [team, setTeam] = useState('');
  const sites = [...new Set(shifts.map(s => s.site))].sort();
  const teams = [...new Set([...shifts.map(s => s.team), ...workers.filter(w => !w.archived).map(w => w.team)])].filter(Boolean).sort();
  const mine = (s: typeof shifts[number]) => role === 'admin' || s.workerIds.includes(selectedWorkerId) || punches.some(p => p.shiftId === s.id && p.workerId === selectedWorkerId);
  const dayOffset = (n: number) => { const d = new Date(now); d.setDate(d.getDate() + n); return localDate(d); };
  const lastDate = filter === 'today' ? dayOffset(0) : filter === 'week' ? dayOffset(6) : dayOffset(29);
  const isUpcoming = (s: typeof shifts[number]) => !s.archived && (!shiftHasEnded(s, now) || shiftHasOpenPunch(s.id, role === 'worker' ? punches.filter(p => p.workerId === selectedWorkerId) : punches));
  const search = query.trim().toLocaleLowerCase();
  const filtered = shifts
    .filter(s => mine(s) && (!search || [s.title, s.site, s.location, s.team].some(value => value.toLocaleLowerCase().includes(search))) && (role !== 'admin' || ((!site || s.site === site) && (!team || s.team === team || s.workerIds.some(id => workers.some(w => w.id === id && w.team === team))))) && (filter === 'history'
      ? shiftHasEnded(s, now) && !isUpcoming(s) && (!s.archived || punches.some(p => p.shiftId === s.id))
      : filter === 'calendar' ? !s.archived : isUpcoming(s) && s.date <= lastDate))
    .sort((a, b) => filter === 'history' ? b.date.localeCompare(a.date) || b.start.localeCompare(a.start) : a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const dayLabel = (date: string) => date === today() ? t('Today') : date === dayOffset(1) ? t('Tomorrow') : formatDay(date);
  const dayGroups = useMemo(() => {
    const groups = new Map<string, typeof shifts>();
    for (const shift of filtered) {
      const group = groups.get(shift.date);
      if (group) group.push(shift); else groups.set(shift.date, [shift]);
    }
    return [...groups].map(([date, shifts]) => ({ date, shifts }));
  }, [filtered]);
  const activeFilters = Number(!!site) + Number(!!team);
  const removable = filtered.filter(shift => !shift.archived && !shiftHasOpenPunch(shift.id, punches));
  const selected = removable.filter(shift => selectedIds.includes(shift.id));
  const toggleSelection = (id: string) => setSelectedIds(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
  const removeSelected = () => {
    if (role !== 'admin' || !selected.length) return;
    confirmRemoval(t('Remove selected shifts?'), `${t(`Remove ${selected.length} filtered shifts?`)}\n${selected.map(shift => `${shift.title} · ${shift.site} · ${shift.date} ${shift.start}–${shift.end}`).join('\n')}\n${t('Clock and pay history will remain. Active shifts will be kept. You can restore removed shifts from Removed shifts.')}`, () => {
      removeShifts(selected.map(shift => shift.id)); setSelectedIds([]); setSelecting(false);
    });
  };
  const renderShift = (shift: typeof shifts[number], hideDate = false) => <ShiftCard key={shift.id} shift={shift} compact hideDate={hideDate} history={filter === 'history'} now={now} layout={desktop ? layout : 'grid'} selection={selecting && role === 'admin' ? { selected: selectedIds.includes(shift.id), disabled: !removable.some(item => item.id === shift.id), onToggle: () => toggleSelection(shift.id) } : undefined} />;
  const eventGroups = [...new Set(filtered.map(shift => shift.site))].sort((a, b) => a.localeCompare(b, language)).map(site => ({ site, shifts: filtered.filter(shift => shift.site === site) }));
  const clearFilters = () => { setSite(''); setTeam(''); setQuery(''); };
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
    {role === 'admin' && removed.length > 0 && <View style={{ marginBottom: 18 }}>
      <Button label="Removed shifts" small variant="outline" onPress={() => setShowRemoved(value => !value)} />
      {showRemoved && <View style={{ marginTop: 12, padding: 18, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, gap: 16 }}>
        <Text style={{ color: C.muted, fontSize: 13 }}>Restore a shift with its original assignments and time records.</Text>
        {removed.slice(0, removedLimit).map(shift => <View key={shift.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}><View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: C.ink, fontWeight: '600' }}>{shift.title}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{shift.site} · {formatDay(shift.date)} · {shift.start}–{shift.end}</Text></View><Button label="Restore" small variant="outline" onPress={() => restoreShift(shift.id)} /></View>)}
        {removed.length > removedLimit && <Button label="View more" small variant="outline" onPress={() => setRemovedLimit(value => value + 5)} />}
      </View>}
    </View>}
    <View style={{ flexDirection: desktop ? 'row' : 'column', alignItems: desktop ? 'center' : 'stretch', gap: 12, marginBottom: 18 }}>
      <View style={{ flex: desktop ? 1 : undefined, minWidth: 0 }}><ScheduleTabs value={filter} onChange={setFilter} /></View>
      {role === 'admin' && <View style={{ alignSelf: desktop ? 'center' : 'flex-end' }}><Button label="Create shift" small icon={<Plus size={18} color={C.onGreen} />} onPress={() => router.push('/new-shift')} /></View>}
    </View>
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
      <InputFocusRing active={searchFocused} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: query ? C.mint : C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingLeft: 14 }}>
        <Search size={18} color={C.muted} />
        <TextInput animatedBorder={false} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} accessibilityLabel="Search shifts" placeholder="Search shifts or sites" value={query} onChangeText={setQuery} autoCorrect={false} style={{ flex: 1, minWidth: 0, minHeight: 48, fontSize: 14, paddingVertical: 12 }} />
        {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><X size={17} color={C.muted} /></Pressable>}
      </InputFocusRing>
      {role === 'admin' && <Pressable accessibilityRole="button" accessibilityLabel={t('Filter shifts')} accessibilityState={{ expanded: showFilters }} onPress={() => setShowFilters(value => !value)} style={{ minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: showFilters || activeFilters ? C.mint : C.surface, borderWidth: 1, borderColor: activeFilters ? C.green : C.line, borderRadius: 12 }}><SlidersHorizontal size={18} color={C.green} /><Text style={{ fontSize: 13, color: C.green }}>{activeFilters || t('Filter')}</Text></Pressable>}
    </View>
    <Disclosure open={showFilters && role === 'admin'}><View style={{ backgroundColor: C.surface, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: C.line, gap: 8, marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted }}>SITE</Text><ChoiceChips label="Filter by site" value={site} onChange={setSite} options={[{ value: '', label: 'All sites' }, ...sites.map(value => ({ value, label: value }))]} />
      <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted }}>TEAM</Text><ChoiceChips label="Filter by team" value={team} onChange={setTeam} options={[{ value: '', label: 'All teams' }, ...teams.map(value => ({ value, label: value }))]} />
    </View></Disclosure>
    {!!activeFilters && role === 'admin' && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}><Text style={{ flex: 1, color: C.green, fontSize: 13 }}>{[site, team].filter(Boolean).join(' · ')}</Text><Pressable accessibilityRole="button" onPress={clearFilters} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: C.green, fontSize: 13 }}>Clear filters</Text></Pressable></View>}
    {!['calendar', 'history'].includes(filter) && <ChoiceChips label="Schedule date range" value={filter} onChange={value => setFilter(value as Tab)} options={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'Next 7 days' }, { value: 'month', label: 'Next 30 days' }]} />}
    {filter !== 'calendar' && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 13 }}>
      <Text accessibilityLiveRegion="polite" style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>{filtered.length} {t(filtered.length === 1 ? 'shift' : 'shifts')} · {dayGroups.length} {t(dayGroups.length === 1 ? 'day' : 'days')}</Text>
      {filter === 'history' ? !!filtered.length && <Button label="Export CSV" small variant="outline" icon={<Download size={16} color={C.green} />} onPress={() => void exportHistory()} /> : null}
    </View>}
    {filter !== 'calendar' && <View style={{ marginBottom: 18, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      {role === 'admin' && <ChoiceChips label="Group shifts" value={groupBy} onChange={value => setGroupBy(value as 'date' | 'site')} options={[{ value: 'date', label: 'By date' }, { value: 'site', label: 'By event / site' }]} />}
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
        {desktop && <View accessibilityRole="radiogroup" accessibilityLabel={t('Shift layout')} style={{ flexDirection: 'row', padding: 4, gap: 4, backgroundColor: C.subtle, borderRadius: 12 }}>{(['list', 'grid'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={t(value === 'list' ? 'List view' : 'Grid view')} accessibilityState={{ checked: layout === value }} onPress={() => setLayout(value)} style={{ minHeight: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 9, backgroundColor: layout === value ? C.surface : 'transparent', borderWidth: 1, borderColor: layout === value ? C.line : 'transparent' }}>{value === 'list' ? <List size={17} color={layout === value ? C.green : C.muted} /> : <LayoutGrid size={17} color={layout === value ? C.green : C.muted} />}<Text style={{ fontSize: 13, color: layout === value ? C.green : C.muted }}>{value === 'list' ? 'List' : 'Grid'}</Text></Pressable>)}</View>}
        {role === 'admin' && <Button label={selecting ? 'Done' : 'Manage shifts'} small variant="outline" onPress={() => { setSelecting(value => !value); setSelectedIds([]); }} />}
      </View>
    </View>}
    {selecting && role === 'admin' && filter !== 'calendar' && <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, padding: 14, borderRadius: 14, marginBottom: 18, gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <View style={{ flexGrow: 1, minWidth: 150 }}><Text accessibilityLiveRegion="polite" style={{ fontWeight: '600', fontSize: 14 }}>{selected.length ? <>{selected.length} <Text>{selected.length === 1 ? 'shift selected' : 'shifts selected'}</Text></> : 'Choose shifts to remove'}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Tap a shift to select it. Your time records stay safe.</Text></View>
        <Pressable accessibilityRole="button" disabled={!removable.length} onPress={() => setSelectedIds(selected.length === removable.length ? [] : removable.map(shift => shift.id))} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={{ color: C.green, fontSize: 13 }}>{selected.length === removable.length && selected.length ? 'Clear selection' : 'Select all shown'}</Text></Pressable>
        <Button label="Remove selected" small variant="danger" disabled={!selected.length} icon={<Trash2 size={16} color={C.red} />} onPress={removeSelected} />
      </View>
    </View>}
    <ScheduleContent key={filter + layout}>
    {filter !== 'calendar' && role === 'admin' && groupBy === 'site' && eventGroups.length > 0 ? eventGroups.map(group => <View key={group.site} style={{ marginBottom: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}><View style={{ flex: 1, minWidth: 0 }}><Text accessibilityRole="header" style={{ color: C.ink, fontSize: 19, fontWeight: '600' }}>{group.site}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{group.shifts.length} {t(group.shifts.length === 1 ? 'shift' : 'shifts')}</Text></View><Button label="Select event" small variant="outline" disabled={!group.shifts.some(shift => !shift.archived && !shiftHasOpenPunch(shift.id, punches))} onPress={() => { setSelecting(true); setSelectedIds(group.shifts.filter(shift => !shift.archived && !shiftHasOpenPunch(shift.id, punches)).map(shift => shift.id)); }} /></View>
      <ContentGrid gap={12} maxColumns={layout === 'list' ? 1 : 2}>{[...group.shifts].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)).map(shift => renderShift(shift))}</ContentGrid>
    </View>) : filter === 'calendar' ? <CalendarView shifts={filtered} now={now} /> : dayGroups.length ? dayGroups.map(group => <View key={group.date} style={{ marginBottom: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View style={{ minWidth: 48, padding: 8, borderRadius: 12, alignItems: 'center', backgroundColor: group.date === today() ? C.green : C.mint }}><Text style={{ fontSize: 10, color: group.date === today() ? C.onGreen : C.green }}>{new Date(`${group.date}T12:00:00`).toLocaleDateString(language, { month: 'short' }).toUpperCase()}</Text><Text style={{ fontSize: 21, fontWeight: '600', color: group.date === today() ? C.onGreen : C.green }}>{Number(group.date.slice(8))}</Text></View>
        <View style={{ flex: desktop ? undefined : 1, flexShrink: 1 }}><Text accessibilityRole="header" style={{ color: C.ink, fontSize: 17, fontWeight: '600' }}>{dayLabel(group.date)}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{group.shifts.length} {t(group.shifts.length === 1 ? 'shift' : 'shifts')}</Text></View>
        <View style={{ height: 1, flex: 1, backgroundColor: C.line }} />
      </View>
      <ContentGrid gap={12} maxColumns={layout === 'list' ? 1 : 2}>{group.shifts.map(shift => renderShift(shift, true))}</ContentGrid>
    </View>) : <Empty title={search || activeFilters ? 'No matching shifts' : filter === 'history' ? 'No shift history yet' : filter === 'today' ? 'Nothing today' : filter === 'week' ? 'Nothing in the next 7 days' : 'Nothing in the next 30 days'} detail={search || activeFilters ? 'Try another search or clear your filters.' : filter === 'history' ? 'Finished shifts and their clock records will appear here.' : 'New assignments will appear here when scheduled.'} action={search || activeFilters ? 'Clear filters' : filter === 'history' ? undefined : role === 'admin' ? 'Create shift' : 'View calendar'} onAction={search || activeFilters ? clearFilters : () => role === 'admin' ? router.push('/new-shift') : setFilter('calendar')} />}
    </ScheduleContent>
  </Screen>;
}
