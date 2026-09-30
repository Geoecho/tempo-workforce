import { router } from 'expo-router';
import { ArrowUpRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo, BrandMark } from './Brand';
import { LanguagePicker } from './LanguagePicker';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { C } from './theme';

export function AuthLayout({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 960;
  const [motion] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!desktop) return;
    let live = true;
    let animation: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!live || reduced) return;
      animation = Animated.loop(Animated.sequence([
        Animated.timing(motion, { toValue: 1, duration: 4200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(motion, { toValue: 0, duration: 4200, useNativeDriver: Platform.OS !== 'web' }),
      ]));
      animation.start();
    }).catch(() => {});
    return () => { live = false; animation?.stop(); };
  }, [motion, desktop]);

  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[s.header, { paddingHorizontal: desktop ? 42 : 24 }]}><Pressable accessibilityRole="link" accessibilityLabel="Explore Tempo" onPress={() => router.replace('/welcome')}><BrandLogo size={26} /></Pressable><LanguagePicker /></View>
    <View style={{ flex: 1, flexDirection: desktop ? 'row' : 'column' }}>
      {desktop && <View style={s.story}><View style={{ maxWidth: 420, zIndex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 38 }}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#ABC19A' }} /><Text style={s.storyEyebrow}>People. Time. In sync.</Text></View><Text style={s.storyTitle}>Every shift,</Text><Text style={[s.storyTitle, { color: '#9BB18E' }]}>in sync.</Text><Text style={s.storyCopy}>The operating space for teams in motion.</Text></View><Animated.View pointerEvents="none" style={{ position: 'absolute', right: -42, bottom: -45, opacity: .18, transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }, { rotate: '4deg' }] }}><BrandMark size={365} color="#BED1AE" /></Animated.View><Pressable accessibilityRole="link" onPress={() => router.replace('/welcome')} style={s.storyLink}><Text style={{ color: '#C6D6BD', fontSize: 12 }}>Explore Tempo</Text><ArrowUpRight size={16} color="#C6D6BD" /></Pressable></View>}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.scroll, { paddingTop: desktop ? 42 : 40, paddingBottom: 42 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} showsVerticalScrollIndicator={false}>
        <View style={s.form}><Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={s.description}>{description}</Text>{children}</View>
      </ScrollView>
    </View>
  </KeyboardAvoidingView></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, header: { height: 83, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 },
  story: { width: '46%', marginLeft: 20, marginBottom: 20, backgroundColor: '#18392C', borderRadius: 16, overflow: 'hidden', padding: 50, justifyContent: 'center', minHeight: 520 },
  storyEyebrow: { color: '#B5C6AA', fontSize: 12 }, storyTitle: { color: '#F5F8EF', fontSize: 67, lineHeight: 72, fontWeight: '400', letterSpacing: -3.5 }, storyCopy: { color: '#A9BD9E', fontSize: 17, lineHeight: 27, maxWidth: 260, marginTop: 27 },
  storyLink: { position: 'absolute', bottom: 38, left: 50, flexDirection: 'row', alignItems: 'center', gap: 14 }, scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 25 }, form: { width: '100%', maxWidth: 385, alignSelf: 'center' },
  title: { color: C.ink, fontSize: 34, fontWeight: '400', letterSpacing: -1.3, lineHeight: 40 }, description: { color: C.muted, fontSize: 14, lineHeight: 22, marginTop: 12, marginBottom: 31 },
});

export const authStyles = StyleSheet.create({
  label: { color: C.ink, fontSize: 12, fontWeight: '500', marginBottom: 9 },
  input: { minHeight: 51, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, paddingHorizontal: 14, fontSize: 15, color: C.ink, marginBottom: 20 }, focused: { borderColor: '#7F9C70', backgroundColor: '#FFFFFF' },
  password: { minHeight: 51, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', marginBottom: 15 }, passwordInput: { flex: 1, minHeight: 49, paddingHorizontal: 14, fontSize: 15, color: C.ink }, eye: { width: 46, minHeight: 49, alignItems: 'center', justifyContent: 'center' },
  submit: { minHeight: 51, borderRadius: 8, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 }, submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  error: { color: C.red, fontSize: 12, lineHeight: 19, marginBottom: 16 }, success: { color: C.green, fontSize: 13, lineHeight: 20, marginBottom: 16, backgroundColor: C.mint, borderRadius: 8, padding: 13 }, hint: { color: C.muted, fontSize: 12, lineHeight: 19, marginBottom: 20 }, back: { alignSelf: 'center', paddingVertical: 20, paddingHorizontal: 12 }, backText: { color: C.green, fontSize: 13 },
});
