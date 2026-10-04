import { ArrowRight } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import { AuthLayout, useAuthStyles } from './AuthLayout';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { AuthField } from './AuthField';
import { PasswordStrength } from './PasswordStrength';
import { AuthMotion } from './AuthMotion';
import { supabase } from '../lib/supabase';
import { useTheme } from './theme';

export function PasswordRecovery({ email, onComplete }: { email: string; onComplete: () => void }) {
  const C = useTheme().colors;
  const s = useAuthStyles();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async () => {
    if (busy) return;
    if (password.length < 8) { setMessage('Use at least 8 characters.'); return; }
    if (password !== confirm) { setMessage('Passwords do not match.'); return; }
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase!.auth.updateUser({ password });
      if (error) { setMessage('Could not update your password. Please try again.'); return; }
      if (Platform.OS === 'web') window.history.replaceState({}, '', window.location.pathname);
      onComplete();
    } catch { setMessage('Could not connect. Check your connection and try again.'); }
    finally { setBusy(false); }
  };
  return <AuthLayout title="Set a new password" description="Choose a secure password for your account.">
    <AuthMotion delay={90}>
    {!!email && <Text style={s.hint}>{email}</Text>}
    <Text style={s.label}>New password</Text><AuthField password accessibilityLabel="New password" autoCapitalize="none" autoCorrect={false} autoComplete="new-password" value={password} onChangeText={setPassword} editable={!busy} placeholder="At least 8 characters" /><PasswordStrength password={password} />
    <Text style={s.label}>Confirm password</Text><AuthField password accessibilityLabel="Confirm password" autoCapitalize="none" autoCorrect={false} autoComplete="new-password" value={confirm} onChangeText={setConfirm} editable={!busy} onSubmitEditing={() => void submit()} placeholder="Repeat your new password" />
    {!!message && <Text accessibilityRole="alert" style={s.error}>{message}</Text>}<Pressable accessibilityRole="button" onPress={() => void submit()} disabled={busy} style={[s.submit, busy && { opacity: .6 }]}>{busy ? <ActivityIndicator color={C.onGreen} /> : <><Text style={s.submitText}>Save password</Text><ArrowRight size={18} color={C.onGreen} /></>}</Pressable>
    </AuthMotion>
  </AuthLayout>;
}
