import { router, usePathname } from 'expo-router';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Image, Keyboard, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Worker } from '../lib/data';
import { useFeedback } from '../lib/feedback';
import { useStore } from '../lib/store';
import { useLanguage } from '../lib/i18n';
import { AppIcon, AppIconName } from './AppIcon';
import { ThemeColors, useTheme } from './theme';
import { BrandLogo } from './Brand';

let pendingTabTransition: { href: string; direction: 1 | -1 } | null = null;
let desktopSidebarCollapsed = false;
if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
  desktopSidebarCollapsed = localStorage.getItem('tempo-desktop-sidebar-collapsed') === 'true';
}

export function Avatar({ worker, size = 36 }: { worker: Worker; size?: number }) { const C = useTheme().colors; return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: worker.color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{worker.photoUri ? <Image source={{ uri: worker.photoUri }} accessibilityLabel={`${worker.name} profile photo`} style={{ width: size, height: size }} /> : <Text style={{ fontSize: size * .32, fontWeight: '500', color: C.green }}>{worker.initials}</Text>}</View>; }
export function SelectionMark({ selected, round = false }: { selected: boolean; round?: boolean }) { const C = useTheme().colors; return <View style={{ width: 20, height: 20, borderRadius: round ? 10 : 6, borderWidth: 1.5, borderColor: C.green, backgroundColor: selected ? C.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{selected && <Check size={14} strokeWidth={3} color={C.onGreen} />}</View>; }
export function Pill({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'gray' | 'orange' }) { const C = useTheme().colors; const styles = useStyles(); return <View style={[styles.pill, { backgroundColor: tone === 'green' ? C.mint : tone === 'orange' ? C.orange : C.subtle }]}><Text style={{ color: tone === 'green' ? C.green : tone === 'orange' ? C.warningText : C.muted, fontSize: 11, fontWeight: '500' }}>{children}</Text></View>; }
export function Button({ label, onPress, icon, variant = 'primary', small = false, disabled = false }: { label: string; onPress: () => void; icon?: React.ReactNode; variant?: 'primary' | 'light' | 'outline' | 'danger'; small?: boolean; disabled?: boolean }) {
  const C = useTheme().colors;
  const styles = useStyles();
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
  return <Animated.View style={{ transform: [{ scale }] }}><Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={press} onPressIn={() => animate(true)} onPressOut={() => animate(false)} style={({ pressed }) => [styles.button, small && { minHeight: 48, paddingHorizontal: 15 }, disabled && { opacity: .5 }, variant === 'light' && { backgroundColor: C.mint }, variant === 'outline' && { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }, variant === 'danger' && { backgroundColor: C.dangerSurface, borderWidth: 1, borderColor: C.red }, pressed && { opacity: .82 }]}>{icon && <Animated.View style={{ transform: [{ translateY: iconMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }, { scale: iconMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }, { rotate: iconMotion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-7deg'] }) }] }}>{icon}</Animated.View>}<Text style={[styles.buttonText, variant !== 'primary' && { color: variant === 'danger' ? C.red : C.green }, small && { fontSize: 14 }]}>{t(label)}</Text></Pressable></Animated.View>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: object }) { const styles = useStyles(); return <View style={[styles.card, style]}>{children}</View>; }
export function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { const styles = useStyles(); const { t } = useLanguage(); return <View style={styles.section}><Text style={styles.sectionTitle}>{t(title)}</Text>{action && <Pressable accessibilityRole="button" onPress={onAction} style={{ minHeight: 48, justifyContent: 'center', paddingLeft: 12 }}><Text style={styles.sectionAction}>{t(action)}</Text></Pressable>}</View>; }
export function Screen({ children, title, subtitle, back = false, action, noNav = false, noScroll = false, wide = false, footer }: { children?: React.ReactNode; title?: string; subtitle?: string; back?: boolean; action?: React.ReactNode; noNav?: boolean; noScroll?: boolean; wide?: boolean; footer?: React.ReactNode }) {
  const C = useTheme().colors;
  const styles = useStyles();
  const { role, workers, selectedWorkerId, workspaceName, accountEmail, notifications } = useStore();
  const { t } = useLanguage();
  const path = usePathname();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 960;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(desktopSidebarCollapsed);
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
      {desktop ? title && <><Text style={[styles.title, { fontSize: 28 }]}>{t(title)}</Text>{subtitle && <Text style={styles.subtitle}>{t(subtitle)}</Text>}</> : <BrandLogo size={24} />}
    </View>
    {action}
    {<Pressable accessibilityRole="button" accessibilityLabel={`${unread} unread notifications`} onPress={() => router.push('/notifications')} style={styles.headerButton}><AppIcon name="bell" size={21} color={C.green} playing={false} />{unread > 0 && <View style={styles.unreadDot} />}</Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel={path === '/settings' ? 'Profile and settings open' : 'Open profile and settings'} accessibilityState={{ disabled: path === '/settings' }} disabled={path === '/settings'} onPress={() => router.push('/settings')} style={[styles.headerProfile, { overflow: 'hidden' }]}>{role === 'worker' && profile?.photoUri ? <Image source={{ uri: profile.photoUri }} style={{ width: 48, height: 48 }} /> : <Text style={styles.headerInitials}>{initials}</Text>}</Pressable>
  </View>;
  const Inner = <Animated.View style={{ flex: noScroll ? 1 : undefined, opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [direction ? 0 : 10, 0] }) }, { translateX: slideX }] }}>
    {!desktop && title && <View style={styles.pageHeading}><Text style={styles.title}>{t(title)}</Text>{subtitle && <Text style={styles.subtitle}>{t(subtitle)}</Text>}</View>}
    {children}
  </Animated.View>;
  const bodyStyles = [styles.body, desktop && styles.desktopBody, desktop && wide && styles.desktopWideBody, desktop && !wide && back && styles.desktopFocusedBody];
  const content = noScroll ? <View style={{ flex: 1, backgroundColor: C.bg }}><View style={[{ flex: 1 }, bodyStyles]}>{Inner}</View></View> : <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={bodyStyles} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>{Inner}</ScrollView>;

  return <SafeAreaView style={styles.safe} edges={desktop || noNav || keyboardOpen ? ['top', 'bottom'] : ['top']}>
    {desktop ? <View style={styles.desktopShell}>
      <BottomNav role={role} desktop collapsed={sidebarCollapsed} onToggleCollapsed={() => {
        const next = !sidebarCollapsed;
        desktopSidebarCollapsed = next;
        if (typeof localStorage !== 'undefined') localStorage.setItem('tempo-desktop-sidebar-collapsed', String(next));
        setSidebarCollapsed(next);
      }} />
      <View style={styles.desktopMain}>{topbar}{content}{footer && <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface }}>{footer}</View>}</View>
    </View> : <>{topbar}{content}{footer && <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface }}>{footer}</View>}{!noNav && !keyboardOpen && <BottomNav role={role} />}</>}
  </SafeAreaView>;
}
function BottomNav({ role, desktop = false, collapsed = false, onToggleCollapsed }: { role: 'admin' | 'worker'; desktop?: boolean; collapsed?: boolean; onToggleCollapsed?: () => void }) {
  const C = useTheme().colors;
  const styles = useStyles();
  const { play } = useFeedback();
  const { t } = useLanguage();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const [hovered, setHovered] = useState<string | null>(null);
  const [activated, setActivated] = useState<string | null>(path);
  const [activationCount, setActivationCount] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setActivated(null), 650);
    return () => clearTimeout(timer);
  }, [path, activated]);
  const tabs = role === 'admin' ? [
    { href: '/', label: 'Home', icon: 'home' }, { href: '/schedule', label: 'Shifts', icon: 'calendar' }, { href: '/team', label: 'Team', icon: 'team' }, { href: '/time', label: 'Time', icon: 'time' }, { href: '/settings', label: 'Settings', icon: 'settings' },
  ] : [
    { href: '/', label: 'Home', icon: 'home' }, { href: '/schedule', label: 'Shifts', icon: 'calendar' }, { href: '/scan', label: 'Scan', icon: 'scan' }, { href: '/time', label: 'Hours', icon: 'time' }, { href: '/settings', label: 'Settings', icon: 'settings' },
  ];
  return <View style={desktop ? [styles.sideNav, collapsed && styles.sideNavCollapsed] : [styles.nav, { height: 69 + insets.bottom, paddingBottom: insets.bottom }]}>
    {desktop && <View style={[styles.sideBrandBox, collapsed && styles.sideBrandBoxCollapsed]}>
      {!collapsed && <BrandLogo size={27} />}
      <Pressable accessibilityRole="button" accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onPress={onToggleCollapsed} style={styles.sidebarToggle}>
        {collapsed ? <ChevronRight size={18} color={C.green} /> : <ChevronLeft size={18} color={C.green} />}
      </Pressable>
    </View>}
    {tabs.map(({ href, label, icon }, index) => {
      const active = path === href || (href === '/schedule' && (path.startsWith('/shift/') || path.startsWith('/edit-shift/') || path === '/new-shift')) || (href === '/team' && (path.startsWith('/worker/') || path === '/new-worker'));
      return <Pressable key={href} accessibilityRole="tab" accessibilityLabel={t(label)} accessibilityState={{ selected: active }} onHoverIn={() => setHovered(href)} onHoverOut={() => setHovered(null)} onFocus={() => setHovered(href)} onBlur={() => setHovered(null)} onPress={() => { setActivated(href); setActivationCount(value => value + 1); play('select'); if (path !== href) { const from = tabs.findIndex(tab => path === tab.href || (tab.href === '/schedule' && path.startsWith('/shift/')) || (tab.href === '/team' && path.startsWith('/worker/'))); pendingTabTransition = { href, direction: index > Math.max(from, 0) ? 1 : -1 }; router.replace(href as never); } }} style={desktop ? [styles.sideNavItem, collapsed && styles.sideNavItemCollapsed, active && styles.sideNavActive] : styles.navItem}>
        <View style={desktop ? [styles.sideIcon, collapsed && styles.sideIconCollapsed] : [styles.navIcon, active && styles.navActive]}><AppIcon key={activated === href ? activationCount : 0} name={icon as AppIconName} size={20} color={active ? C.green : C.muted} playing={hovered === href || activated === href} /></View>
        {!desktop || !collapsed ? <Text style={desktop ? [styles.sideLabel, active && styles.sideLabelActive] : [styles.navLabel, active && { color: C.green, fontWeight: '500' }]}>{t(label)}</Text> : null}
      </Pressable>;
    })}
  </View>;
}
export function Empty({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) { const C = useTheme().colors; const { t } = useLanguage(); return <Card style={{ alignItems: 'center', padding: 28 }}><Text style={{ fontSize: 16, fontWeight: '500', color: C.ink }}>{t(title)}</Text><Text style={{ color: C.muted, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>{t(detail)}</Text>{action && onAction && <View style={{ marginTop: 16 }}><Button label={action} onPress={onAction} small /></View>}</Card>; }
function makeStyles(C: ThemeColors) { return StyleSheet.create({
  desktopShell: { flex: 1, flexDirection: 'row' },
  desktopMain: { flex: 1, minWidth: 0 },
  desktopTopbar: { height: 'auto', minHeight: 100, paddingVertical: 20, paddingHorizontal: 32, backgroundColor: C.bg },
  desktopBody: { maxWidth: '100%', alignSelf: 'stretch', paddingHorizontal: 32, paddingTop: 24, paddingBottom: 40 },
  desktopWideBody: { flex: 1, width: '100%', maxWidth: '100%', alignSelf: 'stretch', paddingHorizontal: 30, paddingTop: 18, paddingBottom: 20 },
  desktopFocusedBody: { maxWidth: 880, paddingTop: 22 },
  sideNav: { width: 236, backgroundColor: C.nav, borderRightWidth: 1, borderRightColor: C.line, paddingHorizontal: 15, paddingTop: 22 },
  sideNavCollapsed: { width: 72, paddingHorizontal: 9 },
  sideBrandBox: { minHeight: 36, paddingHorizontal: 10, marginBottom: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideBrandBoxCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  sidebarToggle: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  sideNavItem: { height: 47, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 14, marginBottom: 6 },
  sideNavItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  sideNavActive: { backgroundColor: C.mint },
  sideIcon: { width: 32, alignItems: 'flex-start' },
  sideIconCollapsed: { width: 'auto', alignItems: 'center' },
  sideLabel: { fontSize: 13, color: C.muted, fontWeight: '400' },
  sideLabelActive: { color: C.green, fontWeight: '500' },
  safe: { flex: 1, backgroundColor: C.surface }, topbar: { height: 66, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.surface }, topIcon: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }, headerButton: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }, unreadDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, right: 7, top: 6, backgroundColor: C.red, borderWidth: 1, borderColor: C.surface }, headerProfile: { width: 48, height: 48, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.mint, borderWidth: 1, borderColor: C.line }, headerInitials: { fontSize: 13, fontWeight: '600', color: C.green }, brand: { fontSize: 23, letterSpacing: -1.2, fontWeight: '600', color: C.ink }, body: { paddingHorizontal: 22, paddingTop: 25, paddingBottom: 42, width: '100%', maxWidth: 620, alignSelf: 'center' }, pageHeading: { marginBottom: 23 }, desktopPageHeading: { paddingBottom: 21, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: C.line }, title: { fontSize: 28, fontWeight: '400', color: C.ink, letterSpacing: -.7 }, subtitle: { color: C.muted, marginTop: 6, fontSize: 14, lineHeight: 20 }, card: { borderRadius: 14, padding: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }, section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 13 }, sectionTitle: { fontSize: 19, fontWeight: '500', letterSpacing: -.3, color: C.ink }, sectionAction: { fontSize: 14, fontWeight: '500', color: C.green }, button: { minHeight: 49, borderRadius: 10, backgroundColor: C.green, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, buttonText: { color: C.onGreen, fontWeight: '500', fontSize: 16 }, pill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }, nav: { height: 69, paddingHorizontal: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', justifyContent: 'space-around' }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }, navIcon: { width: 44, height: 31, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, navActive: { backgroundColor: C.mint }, navLabel: { marginTop: 2, fontSize: 11, color: C.muted },
}); }
function useStyles() { const C = useTheme().colors; return useMemo(() => makeStyles(C), [C]); }
