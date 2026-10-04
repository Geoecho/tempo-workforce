import React, { useEffect, useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import { useReducedMotion } from './AuthMotion';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { useTheme } from './theme';

export function NotificationTabs({ value, unread, onChange }: { value: 'all' | 'unread'; unread: number; onChange: (value: 'all' | 'unread') => void }) {
  const C = useTheme().colors;
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(value === 'all' ? 0 : 1));
  useEffect(() => {
    const target = value === 'all' ? 0 : 1;
    if (reduced) { position.setValue(target); return; }
    const animation = Animated.spring(position, { toValue: target, stiffness: 420, damping: 32, mass: .65, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [value, position, reduced]);
  const segment = (width - 8) / 2;
  return <View accessibilityRole="tablist" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: 300, maxWidth: '100%', flexDirection: 'row', padding: 4, backgroundColor: C.subtle, borderRadius: 14 }}>
    {width > 8 && <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 4, top: 4, bottom: 4, width: segment, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 11, transform: [{ translateX: Animated.multiply(position, segment) }] }} />}
    {(['all', 'unread'] as const).map(key => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: key === value }} onPress={() => onChange(key)} style={{ flex: 1, minHeight: 44, paddingVertical: 10, paddingHorizontal: 8, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 14, lineHeight: 18, flexShrink: 1, textAlign: 'center', fontWeight: '600', color: key === value ? C.green : C.muted }}>{key === 'all' ? 'All' : 'Unread'}</Text>
      {key === 'unread' && <View style={{ minWidth: 22, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, backgroundColor: C.mint }}><Text style={{ color: C.green, fontSize: 11, fontWeight: '700', textAlign: 'center' }}>{unread}</Text></View>}
    </Pressable>)}
  </View>;
}
