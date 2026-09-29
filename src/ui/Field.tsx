import React from 'react';
import { KeyboardTypeOptions, Text, TextInput, View } from 'react-native';
import { C } from './theme';
export function Field({ label, value, onChangeText, placeholder, keyboardType }: { label: string; value: string; onChangeText: (text: string) => void; placeholder: string; keyboardType?: KeyboardTypeOptions }) { return <View style={{ marginBottom: 17 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 13, marginBottom: 8 }}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#A4ADA7" keyboardType={keyboardType} style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 13, minHeight: 50, paddingHorizontal: 15, fontSize: 14, color: C.ink }} /></View>; }
