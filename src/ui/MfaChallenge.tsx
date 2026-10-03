import { ArrowRight } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { verifiedTotpFactorId, verifyTotpCode } from '../lib/mfa';
import { supabase } from '../lib/supabase';
import { AuthLayout, useAuthStyles } from './AuthLayout';
import { Pressable } from './LocalizedPressable';
import { Text, TextInput } from './LocalizedText';
import { useTheme } from './theme';

export function MfaChallenge({ email, onVerified, onSignOut }: { email: string; onVerified: () => void; onSignOut: () => Promise<void> }) {
  const C = useTheme().colors;
  const s = useAuthStyles();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async () => {
    if (busy || !supabase) return;
    if (!/^\d{6}$/.test(code.replace(/\s/g, ''))) { setMessage('Enter the 6-digit code from your authenticator app.'); return; }
    setBusy(true); setMessage('');
    try {
      const factorId = await verifiedTotpFactorId(supabase);
      if (!factorId) { onVerified(); return; }
      await verifyTotpCode(supabase, factorId, code);
      onVerified();
    } catch { setMessage('That code did not work. Check your authenticator app and try again.'); setCode(''); }
    finally { setBusy(false); }
  };
  return <AuthLayout title="Two-step verification" description="Open your authenticator app and enter the 6-digit code for Tempo.">
    {!!email && <Text style={s.hint}>{email}</Text>}
    <Text style={s.label}>Verification code</Text>
    <TextInput accessibilityLabel="Verification code" autoComplete="one-time-code" textContentType="oneTimeCode" keyboardType="number-pad" maxLength={7} autoFocus value={code} onChangeText={setCode} onSubmitEditing={() => void submit()} placeholder="123456" placeholderTextColor={C.placeholder} style={s.input} />
    {!!message && <Text accessibilityRole="alert" style={s.error}>{message}</Text>}
    <Pressable accessibilityRole="button" onPress={() => void submit()} disabled={busy} style={[s.submit, busy && { opacity: .6 }]}>{busy ? <ActivityIndicator color={C.onGreen} /> : <><Text style={s.submitText}>Verify</Text><ArrowRight size={18} color={C.onGreen} /></>}</Pressable>
    <Pressable onPress={() => void onSignOut()} style={s.back}><Text style={s.backText}>Use another account</Text></Pressable>
  </AuthLayout>;
}
