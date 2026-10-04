import { ArrowRight, MailCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { recoveryError } from '../lib/recovery-error';
import { AuthLayout, useAuthStyles } from './AuthLayout';
import { AuthField } from './AuthField';
import { AuthMotion } from './AuthMotion';
import { VerificationCode } from './VerificationCode';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { useTheme } from './theme';

export function EmailRecovery({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const C = useTheme().colors;
  const s = useAuthStyles();
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const send = async () => {
    if (busy || cooldown || !supabase) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setMessage('Enter a valid email address.'); return; }
    setBusy(true); setMessage('');
    try {
      const redirectTo = Platform.OS === 'web' ? `${window.location.origin}/` : 'https://tempo-workforce.vercel.app/';
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      if (error) {
        const failure = recoveryError(error);
        setMessage(failure.message); setCooldown(failure.cooldown);
        // Log only a code and status, never the email, token or raw server message.
        if (__DEV__) console.warn('Recovery email request failed', { code: error.code ?? 'unknown', status: error.status });
        return;
      }
      setSent(true); setCode(''); setCooldown(60);
    } catch { setMessage('Could not connect. Check your connection and try again.'); }
    finally { setBusy(false); }
  };
  const verify = async () => {
    if (busy || !supabase) return;
    if (code.length !== 6) { setMessage('Enter all 6 digits from your recovery email.'); return; }
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: 'recovery' });
      if (error) setMessage('That code is invalid or expired. Check your email or request a new one.');
      // PASSWORD_RECOVERY hands off to PasswordRecovery in OnlineStoreProvider.
    } catch { setMessage('Could not connect. Check your connection and try again.'); }
    finally { setBusy(false); }
  };
  return <AuthLayout title={sent ? 'Check your inbox.' : 'Reset your password.'} description={sent ? 'If this email has a Tempo account, a recovery email is on its way.' : 'A fresh start, in a few simple steps.'}>
    <AuthMotion key={sent ? 'code' : 'email'} delay={70}>
      {sent ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, backgroundColor: C.mint, borderRadius: 14, marginBottom: 24 }}><MailCheck size={23} color={C.green} /><View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>RECOVERY EMAIL</Text><Text style={{ fontSize: 14, fontWeight: '500', color: C.ink }}>{email.trim()}</Text></View></View>
        <Text style={s.label}>Recovery code</Text>
        <VerificationCode value={code} onChange={value => { setCode(value); setMessage(''); }} onSubmit={() => void verify()} disabled={busy} error={!!message} />
        <Text style={s.hint}>Follow the secure link in your email, or enter the 6-digit code if one is included. You can paste the whole code.</Text>
      </> : <><Text style={s.label}>Email address</Text><AuthField accessibilityLabel="Email address" autoComplete="email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="you@company.com" value={email} onChangeText={setEmail} onSubmitEditing={() => void send()} /></>}
      {!!message && <Text accessibilityRole="alert" style={s.error}>{message}</Text>}
      <Pressable accessibilityRole="button" disabled={busy || (!sent && cooldown > 0) || (sent && code.length !== 6)} accessibilityState={{ disabled: busy || (!sent && cooldown > 0) || (sent && code.length !== 6) }} onPress={() => void (sent ? verify() : send())} style={({ pressed }) => [s.submit, { opacity: busy || (!sent && cooldown > 0) || (sent && code.length !== 6) ? .55 : pressed ? .8 : 1 }]}>{busy ? <ActivityIndicator color={C.onGreen} /> : <><Text style={s.submitText}>{sent ? 'Verify code' : cooldown ? `Try again in ${cooldown}s` : 'Send recovery email'}</Text><ArrowRight size={18} color={C.onGreen} /></>}</Pressable>
      {sent && <View style={{ marginTop: 14, alignItems: 'center' }}><Pressable accessibilityRole="button" disabled={busy || cooldown > 0} accessibilityState={{ disabled: busy || cooldown > 0 }} onPress={() => void send()} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 }}><Text style={{ fontSize: 13, color: cooldown ? C.muted : C.green }}>{cooldown ? `Send again in ${cooldown}s` : 'Resend email'}</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => { setSent(false); setCode(''); setMessage(''); }} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 }}><Text style={{ color: C.green, fontSize: 13 }}>Use a different email</Text></Pressable></View>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={onBack} style={s.back}><Text style={s.backText}>Back to sign in</Text></Pressable>
    </AuthMotion>
  </AuthLayout>;
}
