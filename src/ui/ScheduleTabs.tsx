import React, { useEffect, useState } from 'react';
import { Animated, Platform, useWindowDimensions, View } from 'react-native';
import { useLanguage } from '../lib/i18n';
import { useReducedMotion } from './AuthMotion';
import { AppIcon } from './AppIcon';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { useTheme } from './theme';

export function ScheduleTabs({ value, onChange }: { value: string; onChange: (value: 'week' | 'calendar' | 'history') => void }) {
  const C = useTheme().colors;
  const { width: viewportWidth } = useWindowDimensions();
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const index = value === 'calendar' ? 1 : value === 'history' ? 2 : 0;
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(index));
  useEffect(() => {
    const animation = Animated.spring(position, { toValue: index, stiffness: 420, damping: 32, mass: .65, useNativeDriver: Platform.OS !== 'web' });
    if (reduced) { position.setValue(index); return; }
    animation.start();
    return () => animation.stop();
  }, [index, reduced, position]);
  const segment = Math.max(0, (width - 8) / 3);
  return <View accessibilityRole="tablist" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', backgroundColor: C.subtle, borderRadius: 14, padding: 4 }}>
    {!!width && <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 4, top: 4, bottom: 4, width: segment, borderRadius: 11, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, transform: [{ translateX: Animated.multiply(position, segment) }] }} />}
    {(['week', 'calendar', 'history'] as const).map((key, tab) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: index === tab }} onPress={() => onChange(key)} style={({ pressed }) => ({ flex: 1, minHeight: 48, paddingVertical: 10, paddingHorizontal: 5, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 11, opacity: pressed ? .75 : 1 })}>{viewportWidth >= 480 && <AppIcon name={key === 'calendar' ? 'calendar' : key === 'history' ? 'history' : 'upcoming'} size={16} color={index === tab ? C.green : C.muted} playing={index === tab} />}<Text style={{ color: index === tab ? C.green : C.muted, fontWeight: '600', fontSize: 14, lineHeight: 18, flexShrink: 1, textAlign: 'center' }}>{t(key === 'week' ? 'Upcoming' : key === 'calendar' ? 'Calendar' : 'History')}</Text></Pressable>)}
  </View>;
}

export function ScheduleContent({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced) { opacity.setValue(1); return; }
    opacity.setValue(.55);
    const animation = Animated.timing(opacity, { toValue: 1, duration: 110, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [reduced, opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}
