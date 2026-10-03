import { ArrowRight, Building2, Eye, EyeOff, Mail, UsersRound } from 'lucide-react-native';
import { useGlobalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Pressable } from './LocalizedPressable';
import { Text, TextInput } from './LocalizedText';
import { oauthProviders, providerLabel, signInWithOAuth, type OAuthProvider } from '../lib/oauth';
import { supabase } from '../lib/supabase';
import { AuthLayout, useAuthStyles } from './AuthLayout';
import { useTheme } from './theme';

type Mode = 'sign-in' | 'admin' | 'worker' | 'reset' | 'verify';
function errorMessage(error: { code?: string }) {
  const messages: Record<string, string> = {
    invalid_credentials: 'Email or password is incorrect.', email_not_confirmed: 'Confirm your email before signing in.',
    user_already_exists: 'An account with this email already exists.', weak_password: 'Use a stronger password with at least 8 characters.',
    over_email_send_rate_limit: 'Please wait a moment before requesting another email.', over_request_rate_limit: 'Too many attempts. Please try again shortly.',
    signup_disabled: 'Account registration is currently unavailable.',
  };
  return messages[error.code ?? ''] ?? 'Something went wrong. Please try again.';
}

export function AuthScreen() {
  const C = useTheme().colors;
  const s = useAuthStyles();
  const { intent } = useGlobalSearchParams<{ intent?: string }>();
  const [mode, setMode] = useState<Mode>(() => intent === 'admin' || intent === 'worker' ? intent : 'sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const signup = mode === 'admin' || mode === 'worker';
  const changeMode = (next: Mode) => { if (busy) return; setMode(next); setMessage(''); setSuccess(false); setPassword(''); setVisible(false); };

  const submit = async () => {
    if (!supabase || busy) return;
    setSuccess(false);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setMessage('Enter a valid email address.'); return; }
    if (mode !== 'reset' && password.length < (mode === 'sign-in' ? 6 : 8)) { setMessage(mode === 'sign-in' ? 'Enter your password.' : 'Use a password of at least 8 characters.'); return; }
    setBusy(true); setMessage('');
    const redirectTo = Platform.OS === 'web' ? `${window.location.origin}/` : 'https://tempo-workforce.vercel.app/';
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
        setSuccess(!error); setMessage(error ? errorMessage(error) : 'If this email has a Tempo account, you’ll receive a password reset link shortly.');
        return;
      }
      const credentials = { email: email.trim().toLowerCase(), password };
      const { data, error } = mode === 'sign-in' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp({ ...credentials, options: { data: { tempo_intent: mode }, emailRedirectTo: redirectTo } });
      if (error) setMessage(errorMessage(error));
      else if (signup && !data.session) { setPassword(''); setMode('verify'); }
    } catch { setMessage('Could not connect. Check your connection and try again.'); }
    finally { setBusy(false); }
  };

  const continueWith = async (provider: OAuthProvider) => {
    if (!supabase || busy) return;
    setBusy(true); setMessage(''); setSuccess(false);
    try { await signInWithOAuth(supabase, provider, mode === 'admin' || mode === 'worker' ? mode : undefined); }
    catch { setMessage(`Could not continue with ${providerLabel[provider]}. Please try again.`); }
    finally { setBusy(false); }
  };

  const title = mode === 'sign-in' ? 'Welcome back.' : mode === 'admin' ? 'Create your workspace' : mode === 'worker' ? 'Join your team.' : mode === 'verify' ? 'Check your inbox.' : 'Reset your password.';
  const description = mode === 'sign-in' ? 'Your shifts, people, and hours in one place.' : mode === 'admin' ? 'Create an account. Then make a space for your team.' : mode === 'worker' ? 'Use the email address your admin invited.' : mode === 'verify' ? 'Check your email to confirm this account, then sign in.' : 'We’ll email you a secure link to choose a new password.';

  return <AuthLayout title={title} description={description}>
    {mode === 'verify' ? <View><View style={{ padding: 23, borderWidth: 1, borderColor: C.line, borderRadius: 12, alignItems: 'center', gap: 14, marginBottom: 22 }}><Mail size={28} color={C.green} /><Text style={{ color: C.ink, fontSize: 14 }}>{email}</Text></View><Pressable accessibilityRole="button" onPress={() => changeMode('sign-in')} style={s.submit}><Text style={s.submitText}>Back to sign in</Text><ArrowRight size={18} color={C.onGreen} /></Pressable></View> : <>
      {signup && <View style={{ flexDirection: 'row', padding: 4, backgroundColor: C.mint, borderRadius: 9, marginBottom: 27, gap: 4 }}>{(['admin', 'worker'] as const).map(role => <Pressable key={role} accessibilityRole="tab" accessibilityState={{ selected: mode === role }} onPress={() => changeMode(role)} style={{ flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', backgroundColor: mode === role ? C.surface : 'transparent', borderRadius: 6, paddingHorizontal: 8 }}><Text style={{ fontSize: 12, color: mode === role ? C.green : C.muted }}>{role === 'admin' ? 'Create workspace' : 'Join a team'}</Text></Pressable>)}</View>}
      <Text style={s.label}>Email address</Text><TextInput accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" placeholder="you@company.com" placeholderTextColor={C.placeholder} value={email} onChangeText={setEmail} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} onSubmitEditing={mode === 'reset' ? () => void submit() : undefined} style={[s.input, focused === 'email' && s.focused]} />
      {mode !== 'reset' && <><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={s.label}>Password</Text>{mode === 'sign-in' && <Pressable accessibilityRole="button" onPress={() => changeMode('reset')} style={{ paddingVertical: 6, marginBottom: 3 }}><Text style={{ color: C.green, fontSize: 11 }}>Forgot password?</Text></Pressable>}</View><View style={[s.password, focused === 'password' && s.focused]}><TextInput accessibilityLabel="Password" autoCapitalize="none" autoCorrect={false} autoComplete={signup ? 'new-password' : 'current-password'} secureTextEntry={!visible} placeholder={signup ? 'At least 8 characters' : 'Enter your password'} placeholderTextColor={C.placeholder} value={password} onChangeText={setPassword} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} onSubmitEditing={() => void submit()} style={s.passwordInput} /><Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={() => setVisible(!visible)} style={s.eye}>{visible ? <EyeOff size={18} color={C.muted} /> : <Eye size={18} color={C.muted} />}</Pressable></View></>}
      {signup && <Text style={s.hint}>{mode === 'admin' ? 'You can add teams and invite workers after creating the workspace.' : 'Use the same email address your team invited.'}</Text>}
      {!!message && <Text accessibilityRole="alert" style={success ? s.success : s.error}>{message}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void submit()} style={({ pressed }) => [s.submit, { marginTop: 7, opacity: busy || pressed ? .75 : 1 }]}>{busy ? <ActivityIndicator color={C.onGreen} /> : <><Text style={s.submitText}>{mode === 'sign-in' ? 'Sign in' : mode === 'reset' ? 'Send reset link' : 'Create account'}</Text><ArrowRight size={18} color={C.onGreen} /></>}</Pressable>
      {mode !== 'reset' && oauthProviders.length > 0 && <View style={{ marginTop: 18, gap: 10 }}>{oauthProviders.map(provider => <Pressable key={provider} accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void continueWith(provider)} style={({ pressed }) => ({ minHeight: 51, borderRadius: 8, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', opacity: busy || pressed ? .75 : 1 })}><Text style={{ color: C.ink, fontSize: 14, fontWeight: '500' }}>{`Continue with ${providerLabel[provider]}`}</Text></Pressable>)}</View>}
      {mode === 'sign-in' ? <View style={{ marginTop: 32, paddingTop: 23, borderTopWidth: 1, borderTopColor: C.line }}><Text style={{ fontSize: 12, color: C.muted, marginBottom: 13 }}>New to Tempo?</Text>{(['admin', 'worker'] as const).map(role => <Pressable key={role} accessibilityRole="button" onPress={() => changeMode(role)} style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? .6 : 1 })}>{role === 'admin' ? <Building2 size={18} color={C.green} /> : <UsersRound size={18} color={C.green} />}<Text style={{ fontSize: 13, color: C.ink, flex: 1 }}>{role === 'admin' ? 'Set up a workspace' : 'Join an existing team'}</Text><ArrowRight size={16} color={C.muted} /></Pressable>)}</View> : <Pressable accessibilityRole="button" onPress={() => changeMode('sign-in')} style={s.back}><Text style={s.backText}>Back to sign in</Text></Pressable>}
    </>}
  </AuthLayout>;
}
