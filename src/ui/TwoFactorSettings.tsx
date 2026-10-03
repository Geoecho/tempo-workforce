import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { removeTotpFactor, startTotpEnrollment, verifiedTotpFactorId, verifyTotpCode } from '../lib/mfa';
import { supabase } from '../lib/supabase';
import { Card, Section } from './components';
import { Pressable } from './LocalizedPressable';
import { Text, TextInput } from './LocalizedText';
import { useTheme } from './theme';

type Enrollment = { factorId: string; uri: string; secret: string };

export function TwoFactorSettings() {
  const C = useTheme().colors;
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => { if (supabase) setFactorId(await verifiedTotpFactorId(supabase)); }, []);
  useEffect(() => {
    let live = true;
    if (supabase) void verifiedTotpFactorId(supabase).then(id => { if (live) setFactorId(id); });
    return () => { live = false; };
  }, []);
  if (!supabase) return null;
  const client = supabase;

  const run = async (action: () => Promise<void>, failure: string) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await action(); } catch { setMessage(failure); } finally { setBusy(false); }
  };
  const begin = () => run(async () => { setEnrollment(await startTotpEnrollment(client)); setCode(''); }, 'Could not start setup. Please try again.');
  const confirm = () => run(async () => {
    if (!enrollment) return;
    await verifyTotpCode(client, enrollment.factorId, code);
    setEnrollment(null); setCode('');
    await refresh();
    setMessage('Two-step verification is on.');
  }, 'That code did not work. Check your authenticator app and try again.');
  const cancel = () => run(async () => {
    if (enrollment) await client.auth.mfa.unenroll({ factorId: enrollment.factorId });
    setEnrollment(null); setCode('');
  }, 'Could not cancel setup.');
  const turnOff = () => run(async () => {
    if (!factorId) return;
    await removeTotpFactor(client, factorId);
    await refresh();
    setMessage('Two-step verification is off.');
  }, 'Could not turn off two-step verification. Sign in again and retry.');

  const link = (label: string, onPress: () => void, color = C.green) => <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={{ alignSelf: 'flex-start', paddingVertical: 8, marginTop: 6, opacity: busy ? .6 : 1 }}><Text style={{ color, fontWeight: '500' }}>{label}</Text></Pressable>;

  return <><Section title="Two-step verification" /><Card>
    {factorId === undefined ? <ActivityIndicator color={C.green} /> : enrollment ? <>
      <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18 }}>Scan this code with an authenticator app (for example Google Authenticator, Microsoft Authenticator or 1Password), then enter the 6-digit code it shows.</Text>
      <View style={{ alignSelf: 'center', padding: 12, backgroundColor: '#FFFFFF', borderRadius: 12, marginVertical: 14 }}><QRCode value={enrollment.uri} size={170} /></View>
      <Text style={{ color: C.muted, fontSize: 11 }}>Or enter this key manually:</Text>
      <Text selectable style={{ color: C.ink, fontSize: 13, letterSpacing: 1, marginTop: 4, marginBottom: 12 }}>{enrollment.secret}</Text>
      <TextInput accessibilityLabel="Verification code" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={7} value={code} onChangeText={setCode} onSubmitEditing={() => void confirm()} placeholder="123456" placeholderTextColor={C.placeholder} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 12, color: C.ink, backgroundColor: C.surface }} />
      {link('Confirm and turn on', () => void confirm())}
      {link('Cancel', () => void cancel(), C.muted)}
    </> : factorId ? <>
      <Text style={{ color: C.ink, fontWeight: '500' }}>On</Text>
      <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>Signing in asks for a code from your authenticator app.</Text>
      {link('Turn off', () => void turnOff(), C.red)}
    </> : <>
      <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18 }}>Protect this account with a code from an authenticator app each time you sign in. Recommended for admins.</Text>
      {link('Turn on', () => void begin())}
    </>}
    {!!message && <Text accessibilityRole="alert" style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>{message}</Text>}
  </Card></>;
}
