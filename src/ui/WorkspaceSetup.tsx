import { ArrowRight, Check } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthLayout, authStyles as s } from './AuthLayout';
import { Pressable } from './LocalizedPressable';
import { Text, TextInput } from './LocalizedText';
import { C } from './theme';

export function WorkspaceSetup({ email, onCreate, onSignOut }: { email: string; onCreate: (name: string) => Promise<void>; onSignOut: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (busy) return;
    if (!name.trim()) { setError('Enter a workspace name.'); return; }
    setBusy(true); setError('');
    try { await onCreate(name.trim()); } catch { setError('Could not create your workspace.'); }
    finally { setBusy(false); }
  };
  return <AuthLayout title="Make room for your team." description="Give your crew a home. Next, you can add teams and invite workers.">
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 26 }}><Check size={15} color={C.green} /><Text style={{ color: C.green, fontSize: 12 }}>Account created</Text></View>
    <Text style={s.label}>Workspace name</Text><TextInput accessibilityLabel="Workspace name" autoCapitalize="words" placeholder="e.g. Northline Events" placeholderTextColor="#9AA592" value={name} onChangeText={setName} onSubmitEditing={() => void submit()} style={s.input} />
    <Text style={s.hint}>Your time zone comes from this device. You can add teams and invite workers after creating the workspace.</Text>{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Pressable accessibilityRole="button" onPress={() => void submit()} disabled={busy} style={[s.submit, busy && { opacity: .6 }]}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={s.submitText}>Create workspace</Text><ArrowRight size={18} color="#FFFFFF" /></>}</Pressable>
    <Text style={{ color: C.muted, textAlign: 'center', fontSize: 12, marginTop: 26 }}>Signed in as {email}</Text><Pressable onPress={() => void onSignOut()} style={s.back}><Text style={s.backText}>Use another account</Text></Pressable>
  </AuthLayout>;
}
