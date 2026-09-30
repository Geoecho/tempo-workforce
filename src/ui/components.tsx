import { router, usePathname } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Image, Keyboard, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Worker } from '../lib/data';
import { useFeedback } from '../lib/feedback';
import { useStore } from '../lib/store';
import { useLanguage } from '../lib/i18n';
import { AppIcon, AppIconName } from './AppIcon';
import { C } from './theme';

let pendingTabTransition: { href: string; direction: 1 | -1 } | null = null;

export function Avatar({ worker, size = 36 }: { worker: Worker; size?: number }) { return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: worker.color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{worker.photoUri ? <Image source={{ uri: worker.photoUri }} accessibilityLabel={`${worker.name} profile photo`} style={{ width: size, height: size }} /> : <Text style={{ fontSize: size * .32, fontWeight: '700', color: C.green }}>{worker.initials}</Text>}</View>; }
export function SelectionMark({ selected, round = false }: { selected: boolean; round?: boolean }) { return <View style={{ width: 20, height: 20, borderRadius: round ? 10 : 6, borderWidth: 1.5, borderColor: C.green, backgroundColor: selected ? C.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{selected && <Check size={14} strokeWidth={3} color="#FFFFFF" />}</View>; }
export function Pill({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'gray' | 'orange' }) { return <View style={[styles.pill, { backgroundColor: tone === 'green' ? C.mint : tone === 'orange' ? C.orange : '#F1F2F0' }]}><Text style={{ color: tone === 'green' ? C.green : tone === 'orange' ? '#936C31' : C.muted, fontSize: 11, fontWeight: '700' }}>{children}</Text></View>; }
export function Button({ label, onPress, icon, variant = 'primary', small = false }: { label: string; onPress: () => void; icon?: React.ReactNode; variant?: 'primary' | 'light' | 'outline' | 'danger'; small?: boolean }) {
  const { play } = useFeedback();
  const { t } = useLanguage();
  const [scale] = useState(() => new Animated.Value(1));
  const [iconMotion] = useState(() => new Animated.Value(0));
  const [reduced, setReduced] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {}); }, []);
  const animate = (pressed: boolean) => {
    if (reduced) return;
    Animated.spring(scale, { toValue: pressed ? .97 : 1, speed: 28, bounciness: 5, useNativeDriver: Platform.OS !== 'web' }).start();
    Animated.spring(iconMotion, { toValue: pressed ? 1 : 0, speed: 26, bounciness: 7, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  const press = () => { play('select'); onPress(); };
  return <Animated.View style={{ transform: [{ scale }] }}><Pressable accessibilityRole="button" onPress={press} onPressIn={() => animate(true)} onPressOut={() => animate(false)} style={({ pressed }) => [styles.button, small && { minHeight: 39, paddingHorizontal: 15 }, variant === 'light' && { backgroundColor: C.mint }, variant === 'outline' && { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }, variant === 'danger' && { backgroundColor: '#FFF4F2', borderWidth: 1, borderColor: '#F4D4CE' }, pressed && { opacity: .82 }]}>{icon && <Animated.View style={{ transform: [{ translateY: iconMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }, { scale: iconMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }, { rotate: iconMotion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-7deg'] }) }] }}>{icon}</Animated.View>}<Text style={[styles.buttonText, variant !== 'primary' && { color: variant === 'danger' ? C.red : C.green }, small && { fontSize: 13 }]}>{t(label)}</Text></Pressable></Animated.View>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: object }) { return <View style={[styles.card, style]}>{children}</View>; }
export function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { const { t } = useLanguage(); return <View style={styles.section}><Text style={styles.sectionTitle}>{t(title)}</Text>{action && <Pressable onPress={onAction}><Text style={styles.sectionAction}>{t(action)}</Text></Pressable>}</View>; }
export function Screen({ children, title, subtitle, back = false, action, noNav = false }: { children?: React.ReactNode; title?: string; subtitle?: string; back?: boolean; action?: React.ReactNode; noNav?: boolean }) {
  const { role, workers, selectedWorkerId, workspaceName, accountEmail, notifications } = useStore();
  const { t } = useLanguage();
  const path = usePathname();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 960;
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [entrance] = useState(() => new Animated.Value(0));
  const [direction] = useState(() => !desktop && pendingTabTransition?.href === path ? pendingTabTransition.direction : 0);
  const [slideX] = useState(() => new Animated.Value(direction * 28));
  useEffect(() => {
    if (pendingTabTransition?.href === path) pendingTabTransition = null;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced) { entrance.setValue(1); slideX.setValue(0); return; }
      Animated.parallel([
        Animated.timing(entrance, { toValue: 1, duration: 240, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(slideX, { toValue: 0, duration: 240, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }).catch(() => { entrance.setValue(1); slideX.setValue(0); });
  }, [entrance, slideX, path]);
  useEffect(() => {
    const shown = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { shown.remove(); hidden.remove(); };
  }, []);

  const profile = workers.find(worker => worker.id === selectedWorkerId && !worker.archived);
  const initials = role === 'worker' && profile ? profile.initials : (accountEmail?.slice(0, 1) || workspaceName?.slice(0, 1) || 'T').toUpperCase();
  const unread = notifications.filter(item => !item.readAt).length;
  const topbar = <View style={[styles.topbar, desktop && styles.desktopTopbar]}>
    {back && <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.topIcon}><ChevronLeft size={23} color={C.ink} /></Pressable>}
    <View style={{ flex: 1, alignItems: 'flex-start' }}>
      {!desktop && <Text style={styles.brand}>tempo<Text style={{ color: '#69A889' }}>.</Text></Text>}
    </View>
    {action}
    {role === 'worker' && <Pressable accessibilityRole="button" accessibilityLabel={`${unread} unread notifications`} onPress={() => router.push('/notifications')} style={styles.headerButton}><AppIcon name="bell" size={21} color={C.green} playing={false} />{unread > 0 && <View style={styles.unreadDot} />}</Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel={path === '/settings' ? 'Profile and settings open' : 'Open profile and settings'} accessibilityState={{ disabled: path === '/settings' }} disabled={path === '/settings'} onPress={() => router.push('/settings')} style={[styles.headerProfile, { overflow: 'hidden' }]}>{role === 'worker' && profile?.photoUri ? <Image source={{ uri: profile.photoUri }} style={{ width: 39, height: 39 }} /> : <Text style={styles.headerInitials}>{initials}</Text>}</Pressable>
  </View>;
  const content = <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={[styles.body, desktop && styles.desktopBody, desktop && (back || path === '/settings') && styles.desktopFocusedBody]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
    <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [direction ? 0 : 10, 0] }) }, { translateX: slideX }] }}>
      {title && <View style={styles.pageHeading}><Text style={styles.title}>{t(title)}</Text>{subtitle && <Text style={styles.subtitle}>{t(subtitle)}</Text>}</View>}
      {children}
    </Animated.View>
  </ScrollView>;

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    {desktop ? <View style={styles.desktopShell}>
      <BottomNav role={role} desktop />
      <View style={styles.desktopMain}>{topbar}{content}</View>
    </View> : <>{topbar}{content}{!noNav && !keyboardOpen && <BottomNav role={role} />}</>}
  </SafeAreaView>;
}
function BottomNav({ role, desktop = false }: { role: 'admin' | 'worker'; desktop?: boolean }) {
  const { play } = useFeedback();
  const { t } = useLanguage();
  const path = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const [activated, setActivated] = useState<string | null>(path);
  const [activationCount, setActivationCount] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setActivated(null), 650);
    return () => clearTimeout(timer);
  }, [path, activated]);
  const tabs = role === 'admin' ? [
    { href: '/', label: 'Home', icon: 'home' }, { href: '/schedule', label: 'Shifts', icon: 'calendar' }, { href: '/team', label: 'Team', icon: 'team' }, { href: '/time', label: 'Time', icon: 'time' }, { href: '/settings', label: 'More', icon: 'settings' },
  ] : [
    { href: '/', label: 'Home', icon: 'home' }, { href: '/schedule', label: 'Shifts', icon: 'calendar' }, { href: '/scan', label: 'Scan', icon: 'scan' }, { href: '/time', label: 'Hours', icon: 'time' }, { href: '/settings', label: 'More', icon: 'settings' },
  ];
  return <View style={desktop ? styles.sideNav : styles.nav}>
    {desktop && <View style={styles.sideBrandBox}><Text style={styles.brand}>tempo<Text style={{ color: '#69A889' }}>.</Text></Text><Text style={styles.sideCaption}>WORKFORCE</Text></View>}
    {tabs.map(({ href, label, icon }, index) => {
      const active = path === href || (href === '/schedule' && (path.startsWith('/shift/') || path.startsWith('/edit-shift/'))) || (href === '/team' && path.startsWith('/worker/'));
      return <Pressable key={href} accessibilityRole="tab" accessibilityState={{ selected: active }} onHoverIn={() => setHovered(href)} onHoverOut={() => setHovered(null)} onFocus={() => setHovered(href)} onBlur={() => setHovered(null)} onPress={() => { setActivated(href); setActivationCount(value => value + 1); play('select'); if (path !== href) { const from = tabs.findIndex(tab => path === tab.href || (tab.href === '/schedule' && path.startsWith('/shift/')) || (tab.href === '/team' && path.startsWith('/worker/'))); pendingTabTransition = { href, direction: index > Math.max(from, 0) ? 1 : -1 }; router.replace(href as never); } }} style={desktop ? [styles.sideNavItem, active && styles.sideNavActive] : styles.navItem}>
        <View style={desktop ? styles.sideIcon : [styles.navIcon, active && styles.navActive]}><AppIcon key={activated === href ? activationCount : 0} name={icon as AppIconName} size={20} color={active ? C.green : '#929B95'} playing={hovered === href || activated === href} /></View>
        <Text style={desktop ? [styles.sideLabel, active && styles.sideLabelActive] : [styles.navLabel, active && { color: C.green, fontWeight: '700' }]}>{t(label)}</Text>
      </Pressable>;
    })}
  </View>;
}
export function Empty({ title, detail }: { title: string; detail: string }) { const { t } = useLanguage(); return <Card style={{ alignItems: 'center', padding: 28 }}><Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>{t(title)}</Text><Text style={{ color: C.muted, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>{t(detail)}</Text></Card>; }
export const styles = StyleSheet.create({
  desktopShell: { flex: 1, flexDirection: 'row' },
  desktopMain: { flex: 1, minWidth: 0 },
  desktopTopbar: { height: 64, paddingHorizontal: 36, backgroundColor: C.surface },
  desktopLocation: { fontSize: 13, color: C.muted, fontWeight: '700' },
  desktopBody: { maxWidth: 1040, paddingHorizontal: 36, paddingTop: 30, paddingBottom: 60 },
  desktopFocusedBody: { maxWidth: 790, paddingTop: 38 },
  sideNav: { width: 230, backgroundColor: C.surface, borderRightWidth: 1, borderRightColor: C.line, paddingHorizontal: 14, paddingTop: 25 },
  sideBrandBox: { paddingHorizontal: 14, marginBottom: 35 },
  sideCaption: { color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.7, marginTop: 4 },
  sideNavItem: { height: 48, flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, marginBottom: 5 },
  sideNavActive: { backgroundColor: C.mint },
  sideIcon: { width: 32, alignItems: 'flex-start' },
  sideLabel: { fontSize: 14, color: C.muted, fontWeight: '600' },
  sideLabelActive: { color: C.green, fontWeight: '700' },
  safe: { flex: 1, backgroundColor: C.surface }, topbar: { height: 60, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#EFF0ED', backgroundColor: C.surface }, topIcon: { width: 35, height: 35, justifyContent: 'center', alignItems: 'center' }, headerButton: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }, unreadDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, right: 7, top: 6, backgroundColor: C.red, borderWidth: 1, borderColor: C.surface }, headerProfile: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.mint, borderWidth: 1, borderColor: '#D5E8DC' }, headerInitials: { fontSize: 13, fontWeight: '800', color: C.green }, brand: { fontSize: 23, letterSpacing: -1.2, fontWeight: '800', color: C.ink }, body: { paddingHorizontal: 22, paddingTop: 25, paddingBottom: 42, width: '100%', maxWidth: 620, alignSelf: 'center' }, pageHeading: { marginBottom: 23 }, title: { fontSize: 28, fontWeight: '700', color: C.ink, letterSpacing: -.7 }, subtitle: { color: C.muted, marginTop: 6, fontSize: 14, lineHeight: 20 }, card: { borderRadius: 20, padding: 19, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }, section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 13 }, sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -.3, color: C.ink }, sectionAction: { fontSize: 13, fontWeight: '700', color: C.green }, button: { minHeight: 48, borderRadius: 13, backgroundColor: C.green, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 }, pill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }, nav: { height: 69, paddingHorizontal: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', justifyContent: 'space-around' }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }, navIcon: { width: 44, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, navActive: { backgroundColor: C.mint }, navLabel: { marginTop: 2, fontSize: 10, color: '#929B95' },
});
