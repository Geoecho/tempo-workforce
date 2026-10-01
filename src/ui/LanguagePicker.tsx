import { Check, ChevronDown, Globe2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import { LANGUAGES, useLanguage } from '../lib/i18n';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { useTheme } from './theme';

export function LanguagePicker() {
  const C = useTheme().colors;
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  return <View style={{ zIndex: 100 }}><Pressable accessibilityRole="button" accessibilityLabel="Choose language" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 5 }}><Globe2 size={16} color={C.green} /><Text style={{ color: C.green, fontSize: 11 }}>{LANGUAGES.find(item => item.code === language)?.short}</Text><ChevronDown size={12} color={C.muted} /></Pressable>
    {open && <View style={{ position: 'absolute', top: 46, right: 0, width: 175, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 5, shadowColor: C.ink, shadowOpacity: .08, shadowRadius: 16, elevation: 10 }}>{LANGUAGES.map(item => <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: item.code === language }} onPress={() => { setLanguage(item.code); setOpen(false); }} style={{ minHeight: 44, borderRadius: 6, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: item.code === language ? C.mint : 'transparent' }}><Text style={{ fontSize: 13, color: C.ink }}>{item.label}</Text>{item.code === language && <Check size={14} color={C.green} />}</Pressable>)}</View>}
  </View>;
}
