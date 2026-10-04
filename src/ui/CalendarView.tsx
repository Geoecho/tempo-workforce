import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../lib/store';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { localDate, Shift, today } from '../lib/data';
import { useLanguage } from '../lib/i18n';
import { Button, Card, Empty } from './components';
import { ShiftCard } from './ShiftCard';
import { ContentGrid } from './ContentGrid';
import { useTheme } from './theme';

export function CalendarView({ shifts, now }: { shifts: Shift[]; now: number }) {
  const C = useTheme().colors;
  const { role } = useStore();
  const { language, t } = useLanguage();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(today());
  const [width, setWidth] = useState(0);
  const wide = width >= 850;
  const byDate = useMemo(() => { const m = new Map<string, Shift[]>(); for (const s of shifts) m.set(s.date, [...(m.get(s.date) ?? []), s]); return m; }, [shifts]);
  const first = (month.getDay() + 6) % 7; // Monday first
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => localDate(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  while (cells.length % 7) cells.push(null);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(language, { weekday: 'narrow' }));
  const shiftMonth = (n: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + n, 1);
    setMonth(next);
    setSelected(localDate(next));
  };
  const dayShifts = (byDate.get(selected) ?? []).slice().sort((a, b) => a.start.localeCompare(b.start));
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'flex-start', gap: 20 }}>
    <Card style={{ padding: 14, width: wide ? 350 : '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} color={C.green} /></Pressable>
        <Text style={{ color: C.ink, fontSize: 16, fontWeight: '500' }}>{month.toLocaleDateString(language, { month: 'long', year: 'numeric' })}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shiftMonth(1)} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={20} color={C.green} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>{weekdays.map((w, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', color: C.muted, fontSize: 11, paddingBottom: 6 }}>{w}</Text>)}</View>
      {Array.from({ length: cells.length / 7 }, (_, row) => <View key={row} style={{ flexDirection: 'row' }}>
        {cells.slice(row * 7, row * 7 + 7).map((date, col) => {
          if (!date) return <View key={col} style={{ flex: 1, height: 50 }} />;
          const count = byDate.get(date)?.length ?? 0; const isSel = date === selected; const isToday = date === today(); const past = date < localDate(new Date(now));
          return <Pressable key={col} accessibilityRole="button" accessibilityState={{ selected: isSel }} accessibilityLabel={`${date}, ${count} shifts`} onPress={() => setSelected(date)} style={{ flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', opacity: past && !isSel ? .42 : 1 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isSel ? C.green : 'transparent', borderWidth: isToday && !isSel ? 1 : 0, borderColor: C.green }}>
              <Text style={{ color: isSel ? C.onGreen : C.ink, fontSize: 13 }}>{Number(date.slice(8))}</Text>
              {count > 0 && <View style={{ position: 'absolute', bottom: 3, flexDirection: 'row', gap: 2 }}>{Array.from({ length: Math.min(3, count) }, (_, i) => <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isSel ? C.onGreen : C.green }} />)}</View>}
            </View>
          </Pressable>;
        })}
      </View>)}
    </Card>
    <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0 }}>
    <View style={{ borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 16, marginBottom: 16 }}><Text accessibilityRole="header" style={{ color: C.ink, fontSize: 20, fontWeight: '600' }}>{new Date(`${selected}T12:00:00`).toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' })}</Text><Text style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>{dayShifts.length} {t(dayShifts.length === 1 ? 'shift scheduled' : 'shifts scheduled')}</Text></View>
    {role === 'admin' && selected >= today() && <View style={{ marginBottom: 12 }}><Button label="Add shift on this day" small icon={<Plus size={16} color={C.onGreen} />} onPress={() => router.push({ pathname: '/new-shift', params: { date: selected } })} /></View>}
    {dayShifts.length ? <ContentGrid gap={12}>{dayShifts.map(s => <ShiftCard key={s.id} shift={s} compact hideDate now={now} />)}</ContentGrid> : <Empty title="Nothing scheduled" detail="Select another day to see its shifts." />}
    </View>
  </View>;
}
