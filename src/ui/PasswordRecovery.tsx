import { ArrowRight } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import { AuthLayout, useAuthStyles } from './AuthLayout';
import { Pressable } from './LocalizedPressable';
import { Text, TextInput } from './LocalizedText';
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
    {!!email && <Text style={s.hint}>{email}</Text>}
    <Text style={s.label}>New password</Text><TextInput accessibilityLabel="New password" autoCapitalize="none" autoComplete="new-password" secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 8 characters" style={s.input} />
    <Text style={s.label}>Confirm password</Text><TextInput accessibilityLabel="Confirm password" autoCapitalize="none" autoComplete="new-password" secureTextEntry value={confirm} onChangeText={setConfirm} onSubmitEditing={() => void submit()} placeholder="Repeat your new password" style={s.input} />
    {!!message && <Text accessibilityRole="alert" style={s.error}>{message}</Text>}<Pressable accessibilityRole="button" onPress={() => void submit()} disabled={busy} style={[s.submit, busy && { opacity: .6 }]}>{busy ? <ActivityIndicator color={C.onGreen} /> : <><Text style={s.submitText}>Save password</Text><ArrowRight size={18} color={C.onGreen} /></>}</Pressable>
  </AuthLayout>;
}
