import { ArrowRight, Building2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from './theme';

export function WorkspaceSetup({ email, onCreate, onSignOut }: { email: string; onCreate: (name: string) => Promise<void>; onSignOut: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!name.trim()) { setError('Enter a workspace name.'); return; }
    setBusy(true);
    setError('');
    try { await onCreate(name.trim()); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create your workspace.'); }
    setBusy(false);
  };
  return <View style={s.root}><View style={s.shell}>
    <Text style={s.brand}>tempo<Text style={{ color: '#69A889' }}>.</Text></Text>
    <View style={s.icon}><Building2 size={25} color={C.green} /></View>
    <Text style={s.title}>Create your workspace</Text>
    <Text style={s.detail}>Give your crew a home. Next, you can add teams and invite workers.</Text>
    <View style={s.card}><Text style={s.label}>Workspace name</Text><TextInput accessibilityLabel="Workspace name" autoFocus autoCapitalize="words" placeholder="e.g. Northline Events" placeholderTextColor="#9DA9A2" value={name} onChangeText={setName} onSubmitEditing={() => void submit()} style={s.input} /><Text style={s.hint}>Your time zone will be set from this device. You can start with an empty schedule.</Text>{!!error && <Text style={s.error}>{error}</Text>}<Pressable accessibilityRole="button" onPress={() => void submit()} disabled={busy} style={[s.button, busy && { opacity: .6 }]}>{busy ? <ActivityIndicator color="#fff" /> : <><Text style={s.buttonText}>Create workspace</Text><ArrowRight size={19} color="#fff" /></>}</Pressable></View>
    <Text style={s.email}>Signed in as {email}</Text><Pressable onPress={() => void onSignOut()} style={s.signOut}><Text style={{ color: C.green, fontWeight: '700' }}>Use another account</Text></Pressable>
  </View></View>;
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F5F7F3', justifyContent: 'center', padding: 22 }, shell: { alignSelf: 'center', width: '100%', maxWidth: 460 }, brand: { color: C.ink, fontSize: 25, fontWeight: '800', letterSpacing: -1.3, marginBottom: 35 }, icon: { width: 55, height: 55, borderRadius: 17, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 19 }, title: { color: C.ink, fontSize: 30, fontWeight: '800', letterSpacing: -1 }, detail: { color: C.muted, fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 25 }, card: { backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 20, padding: 20 }, label: { color: C.ink, fontWeight: '700', fontSize: 12, marginBottom: 8 }, input: { height: 50, borderRadius: 11, borderColor: C.line, borderWidth: 1, backgroundColor: '#FBFCFA', color: C.ink, fontSize: 15, paddingHorizontal: 14 }, hint: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 12, marginBottom: 20 }, error: { color: C.red, fontSize: 12, marginBottom: 12 }, button: { height: 50, borderRadius: 12, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, buttonText: { color: '#fff', fontSize: 14, fontWeight: '800' }, email: { color: C.muted, textAlign: 'center', fontSize: 12, marginTop: 23 }, signOut: { alignItems: 'center', padding: 12 } });
