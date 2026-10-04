import React, { useState } from 'react';
import { View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { localDate, today } from '../lib/data';
import { useLanguage } from '../lib/i18n';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { useTheme } from './theme';

export function LeaveDateRange({ from, through, onChange }: { from: string; through: string; onChange: (from: string, through: string) => void }) {
  const C = useTheme().colors;
  const { language, t } = useLanguage();
  const [month, setMonth] = useState(() => new Date(`${from.slice(0, 7)}-01T12:00:00`));
  const [selectingEnd, setSelectingEnd] = useState(false);
  const first = (month.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => localDate(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  while (cells.length % 7) cells.push(null);
  const pretty = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' });
  const pick = (date: string) => {
    if (!selectingEnd || date < from) { onChange(date, date); setSelectingEnd(true); }
    else { onChange(from, date); setSelectingEnd(false); }
  };
  return <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginBottom: 20 }}>
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
      {[{ label: 'From date', date: from, end: false }, { label: 'Through date', date: through, end: true }].map(item => <Pressable key={item.label} accessibilityRole="button" onPress={() => { setSelectingEnd(item.end); setMonth(new Date(`${item.date.slice(0, 7)}-01T12:00:00`)); }} style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 10, backgroundColor: selectingEnd === item.end ? C.mint : C.subtle }}><Text style={{ color: C.muted, fontSize: 12 }}>{item.label}</Text><Text style={{ color: C.ink, fontSize: 14, fontWeight: '600', marginTop: 5 }}>{pretty(item.date)}</Text></Pressable>)}
    </View>
    <Text accessibilityLiveRegion="polite" style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>{selectingEnd ? 'Tap the last day of your leave.' : 'Tap the first day of your leave.'}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} color={C.green} /></Pressable>
      <Text style={{ flex: 1, textAlign: 'center', fontWeight: '600' }}>{month.toLocaleDateString(language, { month: 'long', year: 'numeric' })}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={20} color={C.green} /></Pressable>
    </View>
    <View style={{ flexDirection: 'row' }}>{Array.from({ length: 7 }, (_, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', color: C.muted, fontSize: 12 }}>{new Date(2024, 0, i + 1).toLocaleDateString(language, { weekday: 'narrow' })}</Text>)}</View>
    {Array.from({ length: cells.length / 7 }, (_, row) => <View key={row} style={{ flexDirection: 'row' }}>{cells.slice(row * 7, row * 7 + 7).map((date, col) => {
      if (!date) return <View key={col} style={{ flex: 1 }} />;
      const disabled = date < today();
      const edge = date === from || date === through;
      const selected = date >= from && date <= through;
      return <Pressable key={date} accessibilityRole="button" accessibilityLabel={pretty(date)} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => pick(date)} style={{ flex: 1, minHeight: 44, marginVertical: 2, borderRadius: edge ? 10 : 0, alignItems: 'center', justifyContent: 'center', backgroundColor: edge ? C.green : selected ? C.mint : 'transparent', opacity: disabled ? .3 : 1 }}><Text style={{ color: edge ? C.onGreen : C.ink }}>{Number(date.slice(8))}</Text></Pressable>;
    })}</View>)}
    <Text style={{ color: C.muted, fontSize: 13, marginTop: 10 }}>{Math.round((Date.parse(through) - Date.parse(from)) / 86400000) + 1} {t('calendar days')}</Text>
  </View>;
}
