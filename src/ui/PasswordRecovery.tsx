import { ArrowRight, LockKeyhole } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { C } from './theme';

export function PasswordRecovery({ email, onComplete }: { email: string; onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async () => {
    if (password.length < 8) { setMessage('Use at least 8 characters.'); return; }
    if (password !== confirm) { setMessage('Passwords do not match.'); return; }
    setBusy(true);
    setMessage('');
    const { error } = await supabase!.auth.updateUser({ password });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    if (Platform.OS === 'web') window.history.replaceState({}, '', window.location.pathname);
    onComplete();
  };
  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}><View style={s.shell}>
    <Text style={s.brand}>tempo<Text style={{ color: '#69A889' }}>.</Text></Text>
    <View style={s.icon}><LockKeyhole size={24} color={C.green} /></View>
    <Text style={s.title}>Set a new password</Text>
    <Text style={s.detail}>Choose a new password for {email || 'your account'}.</Text>
    <View style={s.card}><Text style={s.label}>New password</Text><TextInput accessibilityLabel="New password" autoComplete="new-password" secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor="#9DA9A2" style={s.input} /><Text style={s.label}>Confirm password</Text><TextInput accessibilityLabel="Confirm password" autoComplete="new-password" secureTextEntry value={confirm} onChangeText={setConfirm} onSubmitEditing={() => void submit()} placeholder="Repeat your new password" placeholderTextColor="#9DA9A2" style={s.input} />{!!message && <Text style={s.error}>{message}</Text>}<Pressable accessibilityRole="button" onPress={() => void submit()} disabled={busy} style={[s.button, busy && { opacity: .6 }]}>{busy ? <ActivityIndicator color="#fff" /> : <><Text style={s.buttonText}>Save password</Text><ArrowRight size={19} color="#fff" /></>}</Pressable></View>
  </View></ScrollView></KeyboardAvoidingView>;
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F5F7F3' }, scroll: { flexGrow: 1, justifyContent: 'center', padding: 22 }, shell: { alignSelf: 'center', width: '100%', maxWidth: 460 }, brand: { color: C.ink, fontSize: 25, fontWeight: '800', letterSpacing: -1.3, marginBottom: 35 }, icon: { width: 55, height: 55, borderRadius: 17, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 19 }, title: { color: C.ink, fontSize: 30, fontWeight: '800', letterSpacing: -1 }, detail: { color: C.muted, fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 25 }, card: { backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 20, padding: 20 }, label: { color: C.ink, fontWeight: '700', fontSize: 12, marginBottom: 8 }, input: { height: 50, borderRadius: 11, borderColor: C.line, borderWidth: 1, backgroundColor: '#FBFCFA', color: C.ink, fontSize: 15, paddingHorizontal: 14, marginBottom: 17 }, error: { color: C.red, fontSize: 12, marginBottom: 12 }, button: { height: 50, borderRadius: 12, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, buttonText: { color: '#fff', fontSize: 14, fontWeight: '800' } });
