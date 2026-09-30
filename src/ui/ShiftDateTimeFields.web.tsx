import React from 'react';
import { View } from 'react-native';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { localDate, today } from '../lib/data';
import { C } from './theme';

type Props = {
  date: string; onDateChange: (value: string) => void;
  start: string; onStartChange: (value: string) => void;
  end: string; onEndChange: (value: string) => void;
  dateLocked?: boolean;
  until?: string; onUntilChange?: (value: string) => void;
};

const inputStyle: React.CSSProperties = {
  width: '100%', minWidth: 0, height: 50, boxSizing: 'border-box', borderRadius: 12,
  border: `1px solid ${C.line}`, background: '#FBFCFA', color: C.ink,
  padding: '0 14px', font: '600 15px system-ui, sans-serif', colorScheme: 'light',
  cursor: 'pointer', outlineColor: C.green,
};

export function ShiftDateTimeFields({ date, onDateChange, start, onStartChange, end, onEndChange, dateLocked = false, until, onUntilChange }: Props) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return <View style={{ marginBottom: 18 }}>
    <Text style={{ color: C.ink, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>Shift date</Text>
    <input aria-label="Shift date" type="date" value={date} disabled={dateLocked} onChange={event => onDateChange(event.currentTarget.value)} style={{ ...inputStyle, opacity: dateLocked ? .55 : 1 }} />
    {!dateLocked && <View style={{ flexDirection: 'row', gap: 8, marginTop: 9, marginBottom: 18 }}>
      {([{ label: 'Today', value: today() }, { label: 'Tomorrow', value: localDate(tomorrow) }]).map(option =>
        <Pressable key={option.label} accessibilityRole="button" onPress={() => onDateChange(option.value)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: date === option.value ? C.mint : C.surface, borderWidth: 1, borderColor: date === option.value ? '#BBDCCB' : C.line }}>
          <Text style={{ color: C.green, fontSize: 12, fontWeight: '500' }}>{option.label}</Text>
        </Pressable>
      )}
    </View>}
    <View style={{ flexDirection: 'row', gap: 12, marginTop: dateLocked ? 17 : 0 }}>
      <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: C.ink, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>Start time</Text><input aria-label="Start time" type="time" step="900" value={start} onChange={event => onStartChange(event.currentTarget.value)} style={inputStyle} /></View>
      <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: C.ink, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>End time</Text><input aria-label="End time" type="time" step="900" min={start} value={end} onChange={event => onEndChange(event.currentTarget.value)} style={inputStyle} /></View>
    </View>
    <Text style={{ color: C.muted, fontSize: 12, marginTop: 9 }}>Choose times in your local time zone. The end must be after the start.</Text>
    {until && onUntilChange && <View style={{ marginTop: 17 }}><Text style={{ color: C.ink, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>Repeat until</Text><input aria-label="Repeat until" type="date" min={date} value={until} onChange={event => onUntilChange(event.currentTarget.value)} style={inputStyle} /></View>}
  </View>;
}
