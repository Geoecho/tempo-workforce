import React from 'react';
import { View } from 'react-native';
import { Field } from './Field';

type Props = {
  date: string; onDateChange: (value: string) => void;
  start: string; onStartChange: (value: string) => void;
  end: string; onEndChange: (value: string) => void;
  dateLocked?: boolean;
};

export function ShiftDateTimeFields({ date, onDateChange, start, onStartChange, end, onEndChange, dateLocked = false }: Props) {
  return <>
    <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={onDateChange} placeholder="2026-09-29" editable={!dateLocked} />
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1 }}><Field label="Start" value={start} onChangeText={onStartChange} placeholder="09:00" /></View>
      <View style={{ flex: 1 }}><Field label="End" value={end} onChangeText={onEndChange} placeholder="17:00" /></View>
    </View>
  </>;
}
