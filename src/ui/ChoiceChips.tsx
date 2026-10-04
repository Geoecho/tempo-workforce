import React from 'react';
import { ScrollView } from 'react-native';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { useTheme } from './theme';
import { useLanguage } from '../lib/i18n';

export function ChoiceChips({ options, value, onChange, label }: { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void; label: string }) {
  const C = useTheme().colors;
  const { t } = useLanguage();
  return <ScrollView style={{ flexGrow: 0, flexShrink: 0 }} horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={t(label)} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
    {options.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: value === option.value }} onPress={() => onChange(option.value)} style={{ minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, maxWidth: 300, justifyContent: 'center', borderRadius: 24, borderWidth: 1, borderColor: value === option.value ? C.green : C.line, backgroundColor: value === option.value ? C.green : C.surface }}>
      <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: '500', color: value === option.value ? C.onGreen : C.ink }}>{option.label}</Text>
    </Pressable>)}
  </ScrollView>;
}
