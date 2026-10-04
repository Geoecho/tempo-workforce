import React from 'react';
import { KeyboardTypeOptions, View } from 'react-native';
import { Text, TextInput } from './LocalizedText';
import { useTheme } from './theme';
export function Field({ label, value, onChangeText, placeholder, keyboardType, editable = true, multiline = false }: { label: string; value: string; onChangeText: (text: string) => void; placeholder: string; keyboardType?: KeyboardTypeOptions; editable?: boolean; multiline?: boolean }) {
  const C = useTheme().colors;

  return <View style={{ marginBottom: 16 }}><Text style={{ color: C.ink, fontWeight: '500', fontSize: 14, marginBottom: 8 }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} editable={editable} multiline={multiline} placeholder={placeholder} placeholderTextColor={C.placeholder} keyboardType={keyboardType} style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 8, minHeight: multiline ? 104 : 51, paddingHorizontal: 15, paddingVertical: multiline ? 15 : undefined, textAlignVertical: multiline ? 'top' : 'center', fontSize: 16, color: C.ink, opacity: editable ? 1 : .55 }} /></View>;
}
