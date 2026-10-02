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
import { useTheme } from './theme';

export function CalendarView({ shifts }: { shifts: Shift[] }) {
  const C = useTheme().colors;
  const { role } = useStore();
  const { language } = useLanguage();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(today());
  const byDate = useMemo(() => { const m = new Map<string, Shift[]>(); for (const s of shifts) m.set(s.date, [...(m.get(s.date) ?? []), s]); return m; }, [shifts]);
  const first = (month.getDay() + 6) % 7; // Monday first
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => localDate(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  while (cells.length % 7) cells.push(null);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(language, { weekday: 'narrow' }));
  const shiftMonth = (n: number) => setMonth(m => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const dayShifts = (byDate.get(selected) ?? []).slice().sort((a, b) => a.start.localeCompare(b.start));
  return <View>
    <Card style={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Pressable accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} color={C.green} /></Pressable>
        <Text style={{ color: C.ink, fontSize: 16, fontWeight: '500' }}>{month.toLocaleDateString(language, { month: 'long', year: 'numeric' })}</Text>
        <Pressable accessibilityLabel="Next month" onPress={() => shiftMonth(1)} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={20} color={C.green} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>{weekdays.map((w, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', color: C.muted, fontSize: 11, paddingBottom: 6 }}>{w}</Text>)}</View>
      {Array.from({ length: cells.length / 7 }, (_, row) => <View key={row} style={{ flexDirection: 'row' }}>
        {cells.slice(row * 7, row * 7 + 7).map((date, col) => {
          if (!date) return <View key={col} style={{ flex: 1, height: 46 }} />;
          const count = byDate.get(date)?.length ?? 0; const isSel = date === selected; const isToday = date === today();
          return <Pressable key={col} accessibilityRole="button" accessibilityLabel={`${date}, ${count} shifts`} onPress={() => setSelected(date)} style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isSel ? C.green : 'transparent', borderWidth: isToday && !isSel ? 1 : 0, borderColor: C.green }}>
              <Text style={{ color: isSel ? C.onGreen : C.ink, fontSize: 13 }}>{Number(date.slice(8))}</Text>
              {count > 0 && <View style={{ position: 'absolute', bottom: 3, flexDirection: 'row', gap: 2 }}>{Array.from({ length: Math.min(3, count) }, (_, i) => <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isSel ? C.onGreen : C.green }} />)}</View>}
            </View>
          </Pressable>;
        })}
      </View>)}
    </Card>
    <Text style={{ color: C.ink, fontSize: 16, fontWeight: '500', marginTop: 20, marginBottom: 12 }}>{new Date(`${selected}T12:00:00`).toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
    {role === 'admin' && selected >= today() && <View style={{ marginBottom: 12 }}><Button label="Add shift on this day" small icon={<Plus size={16} color={C.onGreen} />} onPress={() => router.push({ pathname: '/new-shift', params: { date: selected } })} /></View>}
    {dayShifts.length ? dayShifts.map(s => <ShiftCard key={s.id} shift={s} compact />) : <Empty title="Nothing scheduled" detail="No shifts on this day." />}
  </View>;
}
