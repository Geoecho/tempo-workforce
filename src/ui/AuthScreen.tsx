import { ArrowRight, Building2, Eye, EyeOff, UsersRound } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { AppIcon } from './AppIcon';
import { C } from './theme';

type Mode = 'sign-in' | 'admin' | 'worker' | 'reset';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [onboardingRole, setOnboardingRole] = useState<'admin' | 'worker' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [introMotion] = useState(() => new Animated.Value(0));
  const [haloMotion] = useState(() => new Animated.Value(0));
  const [buttonScale] = useState(() => new Animated.Value(1));
  const [buttonHovered, setButtonHovered] = useState(false);

  useEffect(() => {
    let active = true;
    let haloLoop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!active) return;
      setReducedMotion(reduced);
      if (reduced) {
        introMotion.setValue(1);
        return;
      }
      const driver = Platform.OS !== 'web';
      Animated.timing(introMotion, { toValue: 1, duration: 420, useNativeDriver: driver }).start();
      haloLoop = Animated.loop(Animated.sequence([
        Animated.timing(haloMotion, { toValue: 1, duration: 3100, useNativeDriver: driver }),
        Animated.timing(haloMotion, { toValue: 0, duration: 3100, useNativeDriver: driver }),
      ]));
      haloLoop.start();
    }).catch(() => {
      introMotion.setValue(1);
    });
    return () => { active = false; haloLoop?.stop(); };
  }, [introMotion, haloMotion]);

  const pressScale = (value: number) => {
    if (reducedMotion) return;
    Animated.spring(buttonScale, { toValue: value, speed: 30, bounciness: 5, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const submit = async () => {
    if (!supabase || busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMessage('Enter a valid email address.');
      return;
    }
    if (mode !== 'reset' && password.length < (mode === 'sign-in' ? 6 : 8)) {
      setMessage(mode === 'sign-in' ? 'Enter your password.' : 'Use a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    setMessage('');
    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: 'https://tempo-workforce.vercel.app/' });
      setMessage(error ? error.message : 'If this email has a Tempo account, you’ll receive a password reset link shortly.');
      setBusy(false);
      return;
    }
    const credentials = { email: email.trim().toLowerCase(), password };
    const { data, error } = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp({
          ...credentials,
          options: { data: { tempo_intent: mode }, emailRedirectTo: 'https://tempo-workforce.vercel.app/' },
        });
    if (error) setMessage(error.message);
    else if (mode !== 'sign-in' && !data.session) {
      setMessage('Check your email to confirm this account, then sign in.');
      setMode('sign-in');
    }
    setBusy(false);
  };

  const changeMode = (next: Mode) => {
    setOnboardingRole(null);
    setMode(next);
    setMessage('');
    setPassword('');
  };

  const title = onboardingRole === 'admin' ? 'A calmer way to run your crew.' : onboardingRole === 'worker' ? 'Know where to be. Clock in with confidence.' : mode === 'sign-in' ? 'Welcome back.' : mode === 'admin' ? 'Lead your team.' : mode === 'worker' ? 'Join your team.' : 'Reset your password.';
  const description = onboardingRole
    ? 'Three simple steps to get started with Tempo.'
    : mode === 'sign-in'
    ? 'Your shifts, people, and hours in one place.'
    : mode === 'admin'
      ? 'Create a workspace for your crew and start planning.'
      : mode === 'worker' ? 'Use the email address your admin invited.' : 'We’ll email you a secure link to choose a new password.';

  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Animated.View pointerEvents="none" style={[s.decoration, { transform: [{ translateY: haloMotion.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }) }, { scale: haloMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }]} />
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View style={[s.shell, { opacity: introMotion, transform: [{ translateY: introMotion.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
        <View style={s.brandRow}>
          <Text style={s.brand}>tempo<Text style={{ color: '#69A889' }}>.</Text></Text>
        </View>

        <View style={s.intro}>
          <Text style={s.eyebrow}>YOUR WORKFORCE SPACE</Text>
          <Text style={s.title}>{title}</Text>
          <Text style={s.description}>{description}</Text>
          {!onboardingRole && (mode === 'admin' || mode === 'worker') && <View style={s.steps}><View style={s.activeStep}><Text style={s.activeStepText}>1  ACCOUNT</Text></View><Text style={s.stepDivider}>›</Text><Text style={s.stepText}>{mode === 'admin' ? '2  WORKSPACE' : '2  INVITATION'}</Text><Text style={s.stepDivider}>›</Text><Text style={s.stepText}>3  READY</Text></View>}
        </View>

        {onboardingRole ? <View style={s.formCard}>
          {(onboardingRole === 'admin'
            ? [['01', 'Create your workspace', 'Name your organization and add your teams.'], ['02', 'Plan work across sites', 'Create one-day or repeating shifts, then assign people.'], ['03', 'Review the day', 'Show a live site code and review clock records and monthly pay.']]
            : [['01', 'Join your invitation', 'Sign up with the exact email your admin invited.'], ['02', 'See your next shift', 'Find the site, meeting point, and time in one place.'], ['03', 'Scan at the site', 'Use your iPhone or Android phone to check in and out.']]
          ).map(([number, heading, detail]) => <View key={number} style={s.onboardingRow}><Text style={s.onboardingNumber}>{number}</Text><View style={{ flex: 1 }}><Text style={s.onboardingTitle}>{heading}</Text><Text style={s.onboardingDetail}>{detail}</Text></View></View>)}
          <Pressable accessibilityRole="button" onPress={() => changeMode(onboardingRole)} style={[s.submit, { marginTop: 10 }]}><Text style={s.submitText}>Continue</Text><ArrowRight size={19} color="#fff" /></Pressable>
        </View> : <View style={s.formCard}>
          <Text style={s.formTitle}>{mode === 'sign-in' ? 'Sign in to Tempo' : mode === 'reset' ? 'Recover your account' : 'Create your account'}</Text>
          <Text style={s.label}>Email address</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@company.com"
            placeholderTextColor="#9DA9A2"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            style={[s.input, focused === 'email' && s.focusedInput]}
          />
          {mode !== 'reset' && <><Text style={s.label}>Password</Text>
          <View style={[s.passwordField, focused === 'password' && s.focusedInput]}>
            <TextInput
              accessibilityLabel="Password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              secureTextEntry={!passwordVisible}
              placeholder={mode === 'sign-in' ? 'Enter your password' : 'At least 8 characters'}
              placeholderTextColor="#9DA9A2"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              onSubmitEditing={() => void submit()}
              style={s.passwordInput}
            />
            <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'} onPress={() => setPasswordVisible(visible => !visible)} style={s.eyeButton}>
              {passwordVisible ? <EyeOff size={19} color={C.muted} /> : <Eye size={19} color={C.muted} />}
            </Pressable>
          </View></>}
          {mode === 'sign-in' && <Pressable accessibilityRole="button" onPress={() => changeMode('reset')} style={{ alignSelf: 'flex-end', marginTop: -3, marginBottom: 18 }}><Text style={{ color: C.green, fontSize: 12, fontWeight: '700' }}>Forgot password?</Text></Pressable>}
          {!!message && <Text style={s.message}>{message}</Text>}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}><Pressable accessibilityRole="button" onPress={() => void submit()} onHoverIn={() => setButtonHovered(true)} onHoverOut={() => setButtonHovered(false)} onPressIn={() => { pressScale(.97); setButtonHovered(true); }} onPressOut={() => { pressScale(1); if (Platform.OS !== 'web') setButtonHovered(false); }} disabled={busy} style={[s.submit, busy && { opacity: .65 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <><Text style={s.submitText}>{mode === 'sign-in' ? 'Sign in' : mode === 'reset' ? 'Send reset link' : 'Create account'}</Text><AppIcon name="arrow-right" size={19} color="#fff" playing={buttonHovered} /></>}
          </Pressable></Animated.View>
        </View>}

        {onboardingRole ? <Pressable accessibilityRole="button" onPress={() => setOnboardingRole(null)} style={s.backLink}><Text style={{ color: C.green, fontWeight: '800' }}>Back to sign in</Text></Pressable> : mode === 'sign-in' ? <View style={s.joinCard}>
          <Text style={s.joinHeading}>New to Tempo?</Text>
          <Pressable accessibilityRole="button" onPress={() => setOnboardingRole('admin')} style={({ pressed }) => [s.joinRow, pressed && s.pressedRow]}>
            <View style={s.joinIcon}><Building2 size={19} color={C.green} /></View>
            <View style={{ flex: 1 }}><Text style={s.joinTitle}>Set up a workspace</Text><Text style={s.joinDetail}>For admins planning shifts</Text></View>
            <ArrowRight size={17} color={C.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setOnboardingRole('worker')} style={({ pressed }) => [s.joinRow, { borderBottomWidth: 0 }, pressed && s.pressedRow]}>
            <View style={s.joinIcon}><UsersRound size={19} color={C.green} /></View>
            <View style={{ flex: 1 }}><Text style={s.joinTitle}>Join an existing team</Text><Text style={s.joinDetail}>For invited workers</Text></View>
            <ArrowRight size={17} color={C.muted} />
          </Pressable>
        </View> : <View><Pressable accessibilityRole="button" onPress={() => changeMode('sign-in')} style={s.backLink}>
          <Text style={{ color: C.muted }}>{mode === 'reset' ? 'Remember your password? ' : 'Already have an account? '}<Text style={{ color: C.green, fontWeight: '800' }}>Sign in</Text></Text>
        </Pressable></View>}
      </Animated.View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7F3', overflow: 'hidden' },
  decoration: { position: 'absolute', width: 280, height: 280, borderRadius: 140, borderWidth: 55, borderColor: '#E8F2E9', top: -150, right: -135 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 32 },
  shell: { width: '100%', maxWidth: 470, alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 38 },
  brand: { fontSize: 25, letterSpacing: -1.3, fontWeight: '800', color: C.ink },
  intro: { marginBottom: 24 },
  eyebrow: { color: C.green, fontSize: 10, letterSpacing: 2, fontWeight: '800', marginBottom: 9 },
  title: { color: C.ink, fontSize: 32, fontWeight: '800', letterSpacing: -1.2 },
  description: { color: C.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  steps: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 15 },
  activeStep: { backgroundColor: C.mint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  activeStepText: { color: C.green, fontWeight: '800', fontSize: 9, letterSpacing: .4 },
  stepDivider: { color: C.muted, fontSize: 14 },
  stepText: { color: C.muted, fontWeight: '700', fontSize: 9, letterSpacing: .4 },
  formCard: { backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.line, padding: 20 },
  formTitle: { color: C.ink, fontSize: 16, fontWeight: '800', marginBottom: 21 },
  onboardingRow: { flexDirection: 'row', gap: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.line },
  onboardingNumber: { color: C.green, fontSize: 12, fontWeight: '800', marginTop: 2 },
  onboardingTitle: { color: C.ink, fontSize: 14, fontWeight: '800' },
  onboardingDetail: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  label: { color: C.ink, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  input: { height: 49, borderRadius: 11, borderWidth: 1, borderColor: C.line, backgroundColor: '#FBFCFA', paddingHorizontal: 13, fontSize: 15, color: C.ink, marginBottom: 17 },
  focusedInput: { borderColor: C.green, backgroundColor: '#FFFFFF' },
  passwordField: { height: 49, borderRadius: 11, borderWidth: 1, borderColor: C.line, backgroundColor: '#FBFCFA', flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  passwordInput: { flex: 1, height: '100%', paddingHorizontal: 13, fontSize: 15, color: C.ink },
  eyeButton: { width: 47, height: 47, alignItems: 'center', justifyContent: 'center' },
  message: { color: C.red, fontSize: 12, lineHeight: 18, marginBottom: 15 },
  submit: { height: 50, borderRadius: 12, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  joinCard: { marginTop: 20, borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, paddingHorizontal: 17, paddingTop: 17 },
  joinHeading: { fontSize: 13, color: C.ink, fontWeight: '800', marginBottom: 2 },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 70, borderBottomWidth: 1, borderBottomColor: C.line },
  pressedRow: { backgroundColor: '#F6FAF7' },
  joinIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  joinTitle: { fontSize: 13, fontWeight: '700', color: C.ink },
  joinDetail: { fontSize: 11, color: C.muted, marginTop: 3 },
  backLink: { alignItems: 'center', padding: 20 },
});
