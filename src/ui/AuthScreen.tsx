import { ArrowRight, Building2, Mail, UsersRound } from 'lucide-react-native';
import { useGlobalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { AuthField } from './AuthField';
import { AuthMotion } from './AuthMotion';
import { PasswordStrength } from './PasswordStrength';
import { EmailRecoveryLink } from './EmailRecoveryLink';
import { oauthProviders, providerLabel, signInWithOAuth, type OAuthProvider } from '../lib/oauth';
import { supabase } from '../lib/supabase';
import { AuthLayout, useAuthStyles } from './AuthLayout';
import { useTheme } from './theme';

type Mode = 'sign-in' | 'admin' | 'worker' | 'reset' | 'verify';
function errorMessage(error: { code?: string; status?: number }) {
  const messages: Record<string, string> = {
    invalid_credentials: 'Email or password is incorrect.', email_not_confirmed: 'Confirm your email before signing in.',
    user_already_exists: 'An account with this email already exists.', weak_password: 'Use a stronger password with at least 8 characters.',
    over_email_send_rate_limit: 'Please wait a moment before requesting another email.', over_request_rate_limit: 'Too many attempts. Please try again shortly.',
    signup_disabled: 'Account registration is currently unavailable.',
  };
  return messages[error.code ?? ''] ?? (error.status && error.status >= 500 ? 'The account service could not complete this request. Contact your workspace administrator.' : 'Something went wrong. Please try again.');
}

export function AuthScreen() {
  const C = useTheme().colors;
  const s = useAuthStyles();
  const { intent } = useGlobalSearchParams<{ intent?: string }>();
  const [mode, setMode] = useState<Mode>(() => intent === 'admin' || intent === 'worker' ? intent : 'sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const signup = mode === 'admin' || mode === 'worker';
  const changeMode = (next: Mode) => { if (busy) return; setMode(next); setMessage(''); setPassword(''); };

  const submit = async () => {
    if (!supabase || busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setMessage('Enter a valid email address.'); return; }
    if (password.length < (mode === 'sign-in' ? 6 : 8)) { setMessage(mode === 'sign-in' ? 'Enter your password.' : 'Use a password of at least 8 characters.'); return; }
    setBusy(true); setMessage('');
    const redirectTo = Platform.OS === 'web' ? `${window.location.origin}/` : 'https://tempo-workforce.vercel.app/';
    try {
      const credentials = { email: email.trim().toLowerCase(), password };
      const { data, error } = mode === 'sign-in' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp({ ...credentials, options: { data: { tempo_intent: mode }, emailRedirectTo: redirectTo } });
      if (error) {
        setMessage(errorMessage(error));
        if (__DEV__) console.warn('Account request failed', { action: signup ? 'signup' : 'sign-in', code: error.code ?? 'unknown', status: error.status });
      }
      else if (signup && !data.session) { setPassword(''); setMode('verify'); }
    } catch { setMessage('Could not connect. Check your connection and try again.'); }
    finally { setBusy(false); }
  };

  const continueWith = async (provider: OAuthProvider) => {
    if (!supabase || busy) return;
    setBusy(true); setMessage('');
    try { await signInWithOAuth(supabase, provider, mode === 'admin' || mode === 'worker' ? mode : undefined); }
    catch { setMessage(`Could not continue with ${providerLabel[provider]}. Please try again.`); }
    finally { setBusy(false); }
  };

  if (mode === 'reset') return <EmailRecoveryLink initialEmail={email} onBack={() => changeMode('sign-in')} />;
  const title = mode === 'sign-in' ? 'Welcome back.' : mode === 'admin' ? 'Create your workspace' : mode === 'worker' ? 'Join your team.' : 'Check your inbox.';
  const description = mode === 'sign-in' ? 'Your shifts, people, and hours in one place.' : mode === 'admin' ? 'Create an account. Then make a space for your team.' : mode === 'worker' ? 'Use the email address your admin invited.' : mode === 'verify' ? 'Check your email to confirm this account, then sign in.' : 'We’ll email you a secure link to choose a new password.';

  return <AuthLayout title={title} description={description}>
    <AuthMotion key={mode} delay={90}>
    {mode === 'verify' ? <View><View style={{ padding: 23, borderWidth: 1, borderColor: C.line, borderRadius: 12, alignItems: 'center', gap: 14, marginBottom: 22 }}><Mail size={28} color={C.green} /><Text style={{ color: C.ink, fontSize: 14 }}>{email}</Text></View><Pressable accessibilityRole="button" onPress={() => changeMode('sign-in')} style={s.submit}><Text style={s.submitText}>Back to sign in</Text><ArrowRight size={18} color={C.onGreen} /></Pressable></View> : <>
      {signup && <View style={{ flexDirection: 'row', padding: 4, backgroundColor: C.mint, borderRadius: 9, marginBottom: 27, gap: 4 }}>{(['admin', 'worker'] as const).map(role => <Pressable key={role} accessibilityRole="tab" accessibilityState={{ selected: mode === role }} onPress={() => changeMode(role)} style={{ flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', backgroundColor: mode === role ? C.surface : 'transparent', borderRadius: 6, paddingHorizontal: 8 }}><Text style={{ fontSize: 12, color: mode === role ? C.green : C.muted }}>{role === 'admin' ? 'Create workspace' : 'Join a team'}</Text></Pressable>)}</View>}
      <Text style={s.label}>Email address</Text><AuthField accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" placeholder="you@company.com" value={email} onChangeText={setEmail} editable={!busy} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={s.label}>Password</Text>{mode === 'sign-in' && <Pressable accessibilityRole="button" onPress={() => changeMode('reset')} style={{ minHeight: 44, justifyContent: 'center', marginTop: -16 }}><Text style={{ color: C.green, fontSize: 12 }}>Forgot password?</Text></Pressable>}</View><AuthField key={mode} password accessibilityLabel="Password" autoCapitalize="none" autoCorrect={false} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? 'At least 8 characters' : 'Enter your password'} value={password} onChangeText={setPassword} editable={!busy} onSubmitEditing={() => void submit()} />{signup && <PasswordStrength password={password} />}
      {signup && <Text style={s.hint}>{mode === 'admin' ? 'You can add teams and invite workers after creating the workspace.' : 'Use the same email address your team invited.'}</Text>}
      {!!message && <Text accessibilityRole="alert" style={s.error}>{message}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void submit()} style={({ pressed }) => [s.submit, { marginTop: 7, opacity: busy || pressed ? .75 : 1 }]}>{busy ? <ActivityIndicator color={C.onGreen} /> : <><Text style={s.submitText}>{mode === 'sign-in' ? 'Sign in' : 'Create account'}</Text><ArrowRight size={18} color={C.onGreen} /></>}</Pressable>
      {oauthProviders.length > 0 && <View style={{ marginTop: 18, gap: 10 }}>{oauthProviders.map(provider => <Pressable key={provider} accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void continueWith(provider)} style={({ pressed }) => ({ minHeight: 51, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', opacity: busy || pressed ? .75 : 1 })}><Text style={{ color: C.ink, fontSize: 14, fontWeight: '500' }}>{`Continue with ${providerLabel[provider]}`}</Text></Pressable>)}</View>}
      {mode === 'sign-in' ? <View style={{ marginTop: 32, paddingTop: 23, borderTopWidth: 1, borderTopColor: C.line }}><Text style={{ fontSize: 12, color: C.muted, marginBottom: 13 }}>New to Tempo?</Text>{(['admin', 'worker'] as const).map(role => <Pressable key={role} accessibilityRole="button" onPress={() => changeMode(role)} style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? .6 : 1 })}>{role === 'admin' ? <Building2 size={18} color={C.green} /> : <UsersRound size={18} color={C.green} />}<Text style={{ fontSize: 13, color: C.ink, flex: 1 }}>{role === 'admin' ? 'Set up a workspace' : 'Join an existing team'}</Text><ArrowRight size={16} color={C.muted} /></Pressable>)}</View> : <Pressable accessibilityRole="button" onPress={() => changeMode('sign-in')} style={s.back}><Text style={s.backText}>Back to sign in</Text></Pressable>}
    </>}
    </AuthMotion>
  </AuthLayout>;
}
