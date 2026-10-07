import React, { createContext, useContext, useEffect, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { useReducedMotion } from '../AuthMotion';
import { useTheme } from '../theme';
import { Pressable } from '../LocalizedPressable';
import { Text } from '../LocalizedText';

const MotionContext = createContext(true);
export function DashboardMotion({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return <MotionContext.Provider value={reduced}>{children}</MotionContext.Provider>;
}

export function useDashboardEntrance(delay = 0, native = true, replayKey?: string) {
  const reduced = useContext(MotionContext);
  const [progress] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, delay, duration: 580, easing: Easing.out(Easing.cubic), useNativeDriver: native && Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced, delay, native, replayKey]);
  return progress;
}

export function BentoCard({ children, style, delay = 0, tone = 'paper' }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; delay?: number; tone?: 'paper' | 'mint' | 'forest' }) {
  const C = useTheme().colors;
  const progress = useDashboardEntrance(delay);
  return <Animated.View style={[{ minWidth: 0, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: tone === 'forest' ? '#183C2C' : C.line, backgroundColor: tone === 'forest' ? '#183C2C' : tone === 'mint' ? C.mint : C.surface, overflow: 'hidden', shadowColor: '#142A1E', shadowOpacity: .035, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }, style]}>{children}</Animated.View>;
}

export function BentoTitle({ title, detail, action, onAction }: { title: string; detail?: string; action?: string; onAction?: () => void }) {
  const C = useTheme().colors;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}><View style={{ flex: 1, minWidth: 0 }}><Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: '600', letterSpacing: -.45, color: C.ink }}>{title}</Text>{detail && <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>{detail}</Text>}</View>{action && <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? .55 : 1 })}><Text style={{ fontSize: 12, color: C.green, fontWeight: '500' }}>{action}</Text><ArrowUpRight size={15} color={C.green} /></Pressable>}</View>;
}

export function DashboardAction({ label, detail, icon, onPress, hero = false }: { label: string; detail?: string; icon?: React.ReactNode; onPress: () => void; hero?: boolean }) {
  const C = useTheme().colors;
  const [hovered, setHovered] = useState(false);
  return <Pressable accessibilityRole="button" onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} style={({ pressed }) => ({ minHeight: detail ? 66 : 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: hero ? '#D5EEAB' : hovered ? C.mint : C.subtle, opacity: pressed ? .72 : 1 })}>
    {icon}<View style={{ flex: detail ? 1 : undefined, minWidth: 0 }}><Text style={{ color: hero ? '#183C2C' : C.green, fontSize: 13, fontWeight: '600' }}>{label}</Text>{detail && <Text style={{ color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }}>{detail}</Text>}</View>{detail && <ArrowUpRight size={17} color={C.green} />}
  </Pressable>;
}

export function MetricCard({ label, value, detail, icon, children, delay = 0 }: { label: string; value: string; detail: string; icon: React.ReactNode; children?: React.ReactNode; delay?: number }) {
  const C = useTheme().colors;
  return <BentoCard delay={delay} style={{ flex: 1, padding: 20, minHeight: 148 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><Text style={{ fontSize: 12, color: C.muted, flex: 1 }}>{label}</Text>{icon}</View><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.5} style={{ fontSize: 32, lineHeight: 40, letterSpacing: -1.5, fontWeight: '500', color: C.ink, marginTop: 12 }}>{value}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 7 }}><Text style={{ color: C.muted, fontSize: 11, lineHeight: 17, flex: 1 }}>{detail}</Text>{children}</View></BentoCard>;
}
