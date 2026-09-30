import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays, ChevronDown, Clock3 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { localDate } from '../lib/data';
import { C } from './theme';

type Props = {
  date: string; onDateChange: (value: string) => void;
  start: string; onStartChange: (value: string) => void;
  end: string; onEndChange: (value: string) => void;
  dateLocked?: boolean;
};

type PickerKey = 'date' | 'start' | 'end';
const timeValue = (value: Date) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
const dateValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};
const clockValue = (value: string) => {
  const parsed = new Date();
  const [hour, minute] = value.split(':').map(Number);
  parsed.setHours(Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0, 0, 0);
  return parsed;
};

export function ShiftDateTimeFields({ date, onDateChange, start, onStartChange, end, onEndChange, dateLocked = false }: Props) {
  const [openKey, setOpenKey] = useState<PickerKey | null>(null);
  const [draft, setDraft] = useState(new Date());
  const open = (key: PickerKey) => {
    if (key === 'date' && dateLocked) return;
    const value = key === 'date' ? dateValue(date) : clockValue(key === 'start' ? start : end);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: key === 'date' ? 'date' : 'time',
        is24Hour: true,
        onValueChange: (_event, selected) => {
          if (!selected) return;
          if (key === 'date') onDateChange(localDate(selected));
          else if (key === 'start') onStartChange(timeValue(selected));
          else onEndChange(timeValue(selected));
        },
      });
      return;
    }
    setDraft(value);
    setOpenKey(key);
  };
  const commit = () => {
    if (openKey === 'date') onDateChange(localDate(draft));
    if (openKey === 'start') onStartChange(timeValue(draft));
    if (openKey === 'end') onEndChange(timeValue(draft));
    setOpenKey(null);
  };
  const picker = (label: string, value: string, key: PickerKey) => <View style={{ flex: 1, marginBottom: 17 }}>
    <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13, marginBottom: 8 }}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${label.toLowerCase()}`} disabled={key === 'date' && dateLocked} onPress={() => open(key)} style={({ pressed }) => ({ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 13, minHeight: 50, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', opacity: dateLocked && key === 'date' ? .55 : pressed ? .72 : 1 })}>
      {key === 'date' ? <CalendarDays size={18} color={C.green} /> : <Clock3 size={18} color={C.green} />}
      <Text style={{ flex: 1, color: C.ink, fontSize: 14, marginLeft: 10 }}>{key === 'date' ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : value}</Text>
      <ChevronDown size={16} color={C.muted} />
    </Pressable>
  </View>;
  return <>
    {picker('Date', date, 'date')}
    <View style={{ flexDirection: 'row', gap: 10 }}>{picker('Start', start, 'start')}{picker('End', end, 'end')}</View>
    <Modal visible={openKey !== null} transparent animationType="slide" onRequestClose={() => setOpenKey(null)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' }}>
        <Pressable accessibilityLabel="Close picker" onPress={() => setOpenKey(null)} style={{ flex: 1 }} />
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Pressable accessibilityRole="button" onPress={() => setOpenKey(null)}><Text style={{ color: C.muted, fontSize: 16 }}>Cancel</Text></Pressable>
            <Text style={{ color: C.ink, fontSize: 16, fontWeight: '700' }}>{openKey === 'date' ? 'Choose a date' : openKey === 'start' ? 'Start time' : 'End time'}</Text>
            <Pressable accessibilityRole="button" onPress={commit}><Text style={{ color: C.green, fontSize: 16, fontWeight: '700' }}>Done</Text></Pressable>
          </View>
          {openKey && <DateTimePicker value={draft} mode={openKey === 'date' ? 'date' : 'time'} display={openKey === 'date' ? 'inline' : 'spinner'} themeVariant="light" onValueChange={(_event, selected) => { if (selected) setDraft(selected); }} style={{ alignSelf: 'center', width: '100%', height: openKey === 'date' ? 320 : 190 }} />}
        </View>
      </View>
    </Modal>
  </>;
}
