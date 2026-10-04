import { InputFocusRing } from './InputFocusRing';
import React, { useEffect, useState } from 'react';
import { Animated, Platform, TextInput, View } from 'react-native';
import { useLanguage } from '../lib/i18n';
import { Text } from './LocalizedText';
import { useReducedMotion } from './AuthMotion';
import { useTheme } from './theme';

export function VerificationCode({ value, onChange, onSubmit, disabled = false, error = false, length = 6 }: { value: string; onChange: (value: string) => void; onSubmit: () => void; disabled?: boolean; error?: boolean; length?: number }) {
  const C = useTheme().colors;
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [pulse] = useState(() => new Animated.Value(1));
  const [shake] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!error || reduced) { shake.setValue(0); return; }
    const animation = Animated.sequence([4, -4, 3, -3, 0].map(toValue => Animated.timing(shake, { toValue, duration: 60, useNativeDriver: Platform.OS !== 'web' })));
    animation.start();
    return () => animation.stop();
  }, [error, reduced, shake]);
  useEffect(() => {
    if (reduced || !focused || disabled) { pulse.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: .3, duration: 700, useNativeDriver: Platform.OS !== 'web' }), Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' })]));
    animation.start();
    return () => animation.stop();
  }, [pulse, focused, reduced, disabled]);
  return <Animated.View style={{ marginBottom: 18, minHeight: 60, transform: [{ translateX: shake }] }}>
    <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', gap: 7 }}>
      {Array.from({ length }, (_, index) => {
        const active = focused && index === Math.min(value.length, length - 1);
        return <InputFocusRing active={active && !disabled && !error} key={index} style={{ flex: 1, minWidth: 0, minHeight: 60, borderRadius: 12, borderWidth: 1, borderColor: error ? C.red : C.line, backgroundColor: value[index] || active ? C.mint : C.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 23, fontWeight: '500', color: C.ink, fontVariant: ['tabular-nums'] }}>{value[index] ?? ''}</Text>{active && !value[index] && <Animated.View style={{ position: 'absolute', width: 2, height: 20, borderRadius: 1, backgroundColor: C.green, opacity: pulse }} />}</InputFocusRing>;
      })}
    </View>
    <TextInput nativeID="tempo-auth-code" accessibilityLabel={t('Verification code')} value={value} onChangeText={text => onChange(text.replace(/\D/g, '').slice(0, length))} editable={!disabled} autoComplete="one-time-code" textContentType="oneTimeCode" keyboardType="number-pad" autoCorrect={false} autoCapitalize="none" maxLength={32} caretHidden selectionColor="transparent" underlineColorAndroid="transparent" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onSubmitEditing={onSubmit} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', color: 'transparent', backgroundColor: 'transparent', fontSize: 24 }} />
  </Animated.View>;
}
