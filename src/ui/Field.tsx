import React, { useState } from 'react';
import { KeyboardTypeOptions, View } from 'react-native';
import { Text, TextInput } from './LocalizedText';
import { C } from './theme';
export function Field({ label, value, onChangeText, placeholder, keyboardType, editable = true }: { label: string; value: string; onChangeText: (text: string) => void; placeholder: string; keyboardType?: KeyboardTypeOptions; editable?: boolean }) {
  const [focused, setFocused] = useState(false);
  return <View style={{ marginBottom: 21 }}><Text style={{ color: C.ink, fontWeight: '500', fontSize: 12, marginBottom: 9 }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} editable={editable} placeholder={placeholder} placeholderTextColor="#9AA592" keyboardType={keyboardType} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: focused ? '#7F9C70' : C.line, borderRadius: 8, minHeight: 51, paddingHorizontal: 15, fontSize: 14, color: C.ink, opacity: editable ? 1 : .55 }} /></View>;
}
