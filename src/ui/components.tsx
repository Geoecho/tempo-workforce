import { router, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CalendarDays, ChartNoAxesCombined, ChevronLeft, House, QrCode, Settings2, UsersRound } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Worker } from '../lib/data';
import { useStore } from '../lib/store';
import { C } from './theme';

export function Avatar({ worker, size = 36 }: { worker: Worker; size?: number }) { return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: worker.color, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: size * .32, fontWeight: '700', color: C.green }}>{worker.initials}</Text></View>; }
export function Pill({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'gray' | 'orange' }) { return <View style={[styles.pill, { backgroundColor: tone === 'green' ? C.mint : tone === 'orange' ? C.orange : '#F1F2F0' }]}><Text style={{ color: tone === 'green' ? C.green : tone === 'orange' ? '#936C31' : C.muted, fontSize: 11, fontWeight: '700' }}>{children}</Text></View>; }
export function Button({ label, onPress, icon, variant = 'primary', small = false }: { label: string; onPress: () => void; icon?: React.ReactNode; variant?: 'primary' | 'light' | 'outline' | 'danger'; small?: boolean }) {
  const [scale] = useState(() => new Animated.Value(1));
  const [reduced, setReduced] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {}); }, []);
  const animate = (toValue: number) => { if (reduced) return; Animated.spring(scale, { toValue, speed: 28, bounciness: 5, useNativeDriver: Platform.OS !== 'web' }).start(); };
  const press = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); onPress(); };
  return <Animated.View style={{ transform: [{ scale }] }}><Pressable accessibilityRole="button" onPress={press} onPressIn={() => animate(.97)} onPressOut={() => animate(1)} style={({ pressed }) => [styles.button, small && { minHeight: 39, paddingHorizontal: 15 }, variant === 'light' && { backgroundColor: C.mint }, variant === 'outline' && { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }, variant === 'danger' && { backgroundColor: '#FFF4F2', borderWidth: 1, borderColor: '#F4D4CE' }, pressed && { opacity: .82 }]}>{icon}<Text style={[styles.buttonText, variant !== 'primary' && { color: variant === 'danger' ? C.red : C.green }, small && { fontSize: 13 }]}>{label}</Text></Pressable></Animated.View>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: object }) { return <View style={[styles.card, style]}>{children}</View>; }
export function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{action && <Pressable onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></Pressable>}</View>; }
export function Screen({ children, title, subtitle, back = false, action, noNav = false }: { children?: React.ReactNode; title?: string; subtitle?: string; back?: boolean; action?: React.ReactNode; noNav?: boolean }) {
  const { role } = useStore();
  const [entrance] = useState(() => new Animated.Value(0));
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(reduced => { if (reduced) entrance.setValue(1); else Animated.timing(entrance, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== 'web' }).start(); }).catch(() => entrance.setValue(1)); }, [entrance]);
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><View style={styles.topbar}>{back ? <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.topIcon}><ChevronLeft size={23} color={C.ink} /></Pressable> : <View style={styles.topIcon} />}<View style={{ flex: 1, alignItems: 'center' }}><Text style={styles.brand}>tempo<Text style={{ color: '#69A889' }}>.</Text></Text></View>{action ?? <View style={styles.topIcon} />}</View><ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}><Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>{title && <View style={styles.pageHeading}><Text style={styles.title}>{title}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View>}{children}</Animated.View></ScrollView>{!noNav && <BottomNav role={role} />}</SafeAreaView>;
}
function BottomNav({ role }: { role: 'admin' | 'worker' }) {
  const path = usePathname();
  const tabs = role === 'admin' ? [
    { href: '/', label: 'Home', Icon: House }, { href: '/schedule', label: 'Shifts', Icon: CalendarDays }, { href: '/team', label: 'Team', Icon: UsersRound }, { href: '/time', label: 'Time', Icon: ChartNoAxesCombined }, { href: '/settings', label: 'More', Icon: Settings2 },
  ] : [
    { href: '/', label: 'Home', Icon: House }, { href: '/schedule', label: 'Shifts', Icon: CalendarDays }, { href: '/scan', label: 'Scan', Icon: QrCode }, { href: '/time', label: 'Hours', Icon: ChartNoAxesCombined }, { href: '/settings', label: 'More', Icon: Settings2 },
  ];
  return <View style={styles.nav}>{tabs.map(({ href, label, Icon }) => <Pressable key={href} onPress={() => { if (path !== href && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); router.replace(href as never); }} style={styles.navItem}><View style={[styles.navIcon, path === href && styles.navActive]}><Icon size={20} strokeWidth={path === href ? 2.5 : 1.9} color={path === href ? C.green : '#929B95'} /></View><Text style={[styles.navLabel, path === href && { color: C.green, fontWeight: '700' }]}>{label}</Text></Pressable>)}</View>;
}
export function Empty({ title, detail }: { title: string; detail: string }) { return <Card style={{ alignItems: 'center', padding: 28 }}><Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>{title}</Text><Text style={{ color: C.muted, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>{detail}</Text></Card>; }
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, topbar: { height: 55, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EFF0ED', backgroundColor: C.bg }, topIcon: { width: 35, height: 35, justifyContent: 'center', alignItems: 'center' }, brand: { fontSize: 23, letterSpacing: -1.2, fontWeight: '800', color: C.ink }, body: { paddingHorizontal: 22, paddingTop: 25, paddingBottom: 42, width: '100%', maxWidth: 620, alignSelf: 'center' }, pageHeading: { marginBottom: 23 }, title: { fontSize: 28, fontWeight: '700', color: C.ink, letterSpacing: -.7 }, subtitle: { color: C.muted, marginTop: 6, fontSize: 14, lineHeight: 20 }, card: { borderRadius: 20, padding: 19, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }, section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 13 }, sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -.3, color: C.ink }, sectionAction: { fontSize: 13, fontWeight: '700', color: C.green }, button: { minHeight: 48, borderRadius: 13, backgroundColor: C.green, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 }, pill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }, nav: { height: 69, paddingHorizontal: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', justifyContent: 'space-around' }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }, navIcon: { width: 44, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, navActive: { backgroundColor: C.mint }, navLabel: { marginTop: 2, fontSize: 10, color: '#929B95' },
});
