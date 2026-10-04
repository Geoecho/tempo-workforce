import { ArrowRight, MailCheck } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { recoveryError } from '../lib/recovery-error';
import { AuthLayout, useAuthStyles } from './AuthLayout';
import { AuthField } from './AuthField';
import { AuthMotion } from './AuthMotion';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { useTheme } from './theme';

// Keep the optional OTP interface in EmailRecovery.tsx for a future rollout.
export function EmailRecoveryLink({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const C = useTheme().colors;
  const s = useAuthStyles();
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const sending = useRef(false);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const send = async () => {
    if (sending.current || cooldown || !supabase) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setMessage('Enter a valid email address.'); return; }
    sending.current = true;
    setBusy(true); setMessage('');
    try {
      const redirectTo = Platform.OS === 'web' ? `${window.location.origin}/` : 'https://tempo-workforce.vercel.app/';
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      if (error) { const failure = recoveryError(error); setMessage(failure.message); setCooldown(failure.cooldown); return; }
      setSent(true); setCooldown(60);
    } catch { setMessage('Could not connect. Check your connection and try again.'); }
    finally { sending.current = false; setBusy(false); }
  };
  return <AuthLayout title="Reset your password." description="We’ll email you a secure link to choose a new password.">
    <AuthMotion delay={70}>
      <Text style={s.label}>Email address</Text><AuthField accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={value => { setEmail(value); setSent(false); }} editable={!busy} placeholder="you@company.com" onSubmitEditing={() => void send()} />
      {sent && <View accessibilityRole="alert" style={{ backgroundColor: C.mint, borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12, marginBottom: 20 }}><MailCheck size={22} color={C.green} /><Text style={{ flex: 1, color: C.green, fontSize: 14, lineHeight: 21 }}>If this email has a Tempo account, you’ll receive a password reset link shortly.</Text></View>}
      {!!message && <Text accessibilityRole="alert" style={s.error}>{message}</Text>}
      <Pressable accessibilityRole="button" disabled={busy || cooldown > 0} accessibilityState={{ disabled: busy || cooldown > 0 }} onPress={() => void send()} style={[s.submit, (busy || cooldown > 0) && { opacity: .55 }]}>{busy ? <ActivityIndicator color={C.onGreen} /> : <><Text style={s.submitText}>{cooldown ? `Send again in ${cooldown}s` : 'Send reset link'}</Text><ArrowRight size={18} color={C.onGreen} /></>}</Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onBack} style={s.back}><Text style={s.backText}>Back to sign in</Text></Pressable>
    </AuthMotion>
  </AuthLayout>;
}
