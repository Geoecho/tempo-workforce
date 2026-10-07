import React, { useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { AuthMotion } from './AuthMotion';
import { signInWithGoogle } from '../lib/oauth';
import { supabase } from '../lib/supabase';
import { AuthLayout, useAuthStyles } from './AuthLayout';
import { useTheme } from './theme';

export function AuthScreen({ initialMessage = '' }: { initialMessage?: string }) {
  const C = useTheme().colors;
  const s = useAuthStyles();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const continueWithGoogle = async () => {
    if (busy) return;
    if (!supabase) {
      setMessage('Google sign-in is not configured. Contact your workspace administrator.');
      return;
    }
    setBusy(true);
    setMessage('');
    try { await signInWithGoogle(supabase); }
    catch { setMessage('Could not continue with Google. Please try again. If Google is in testing, check that your account is listed as a test user.'); }
    finally { setBusy(false); }
  };
  return <AuthLayout title="Welcome to Tempo." description="Your shifts, people, and hours in one place.">
    <AuthMotion delay={90}>
      <View style={{ backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 20, shadowColor: '#193B2C', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 2 }}>
        <Text style={{ color: C.green, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 16 }}>ONE SIMPLE SIGN-IN</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void continueWithGoogle()} style={({ pressed }) => ({ minHeight: 58, borderRadius: 12, borderWidth: 1, borderColor: '#747775', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: busy || pressed ? .72 : 1 })}>
          {busy ? <ActivityIndicator color="#1F1F1F" /> : <><Image source={require('../../assets/google-g.png')} style={{ width: 22, height: 22, tintColor: '#254E3D' }} resizeMode="contain" /><Text style={{ color: '#1F1F1F', fontSize: 15, fontWeight: '600' }}>Continue with Google</Text></>}
        </Pressable>
        <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 16 }}>Your Google password stays with Google.</Text>
      </View>
      <Text style={[s.hint, { marginTop: 18, marginBottom: 0 }]}>Use the Google account with the same email as your Tempo account or team invitation.</Text>
      {!!message && <Text accessibilityRole="alert" style={[s.error, { marginTop: 18 }]}>{message}</Text>}
      <View style={{ marginTop: 30, paddingTop: 22, borderTopWidth: 1, borderTopColor: C.line }}>
        <Text style={{ fontSize: 13, color: C.ink, marginBottom: 8 }}>New to Tempo?</Text>
        <Text style={{ fontSize: 12, color: C.muted, lineHeight: 20 }}>Continue with Google, then choose Employee or Admin to get started.</Text>
      </View>
    </AuthMotion>
  </AuthLayout>;
}
