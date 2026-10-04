import React, { useEffect, useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import { passwordStrength } from '../lib/password-strength';
import { Text } from './LocalizedText';
import { useTheme } from './theme';
import { useReducedMotion } from './AuthMotion';

function Segment({ filled, color, index, reduced }: { filled: boolean; color: string; index: number; reduced: boolean }) {
  const C = useTheme().colors;
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: filled ? 1 : 0, duration: reduced ? 0 : 240, delay: reduced ? 0 : index * 35, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [filled, reduced, progress, index]);
  return <View style={{ flex: 1, height: 4, backgroundColor: C.line, borderRadius: 4, overflow: 'hidden' }}><Animated.View style={{ height: 4, backgroundColor: color, opacity: progress, transform: [{ scaleX: progress }] }} /></View>;
}

export function PasswordStrength({ password }: { password: string }) {
  const C = useTheme().colors;
  const reduced = useReducedMotion();
  const { score, label, hint } = passwordStrength(password);
  const color = score === 1 ? C.red : score === 2 ? C.warningText : C.green;
  return <View style={{ marginTop: -2, marginBottom: 22, gap: 9 }}>
    <View style={{ flexDirection: 'row', gap: 5 }}>{[0, 1, 2, 3].map(index => <Segment key={index} index={index} reduced={reduced} filled={index < score} color={color} />)}</View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ fontSize: 11, color: C.muted }}>Password strength</Text><Text accessibilityLiveRegion="polite" style={{ fontSize: 11, fontWeight: '600', color: score ? color : C.muted }}>{score ? label : 'Start typing'}</Text></View>
    <Text style={{ fontSize: 12, lineHeight: 18, color: C.muted }}>{hint}</Text>
  </View>;
}
