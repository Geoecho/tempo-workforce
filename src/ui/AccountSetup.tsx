import { ArrowRight, Building2, UsersRound } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthLayout, useAuthStyles } from './AuthLayout';
import { AuthMotion } from './AuthMotion';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { useTheme } from './theme';

export type AccountRole = 'admin' | 'employee';

export function AccountSetup({ email, employee = false, onChoose, onRetry, onSignOut }: {
  email: string; employee?: boolean; onChoose: (role: AccountRole) => void;
  onRetry: () => Promise<void>; onSignOut: () => Promise<void>;
}) {
  const C = useTheme().colors;
  const s = useAuthStyles();
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    if (busy) return;
    setBusy(true);
    try { await onRetry(); } finally { setBusy(false); }
  };
  return <AuthLayout title={employee ? 'Join your team.' : 'Welcome to Tempo.'} description={employee ? 'Your admin connects you to your team with an invitation.' : 'You’re signed in. How will you use Tempo?'}>
    <AuthMotion>
      {employee ? <View style={{ padding: 22, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }}>
        <UsersRound size={26} color={C.green} />
        <Text accessibilityRole="header" style={{ color: C.ink, fontSize: 19, marginTop: 18 }}>Waiting for your invitation</Text>
        <Text style={{ color: C.muted, fontSize: 14, lineHeight: 22, marginTop: 10, marginBottom: 22 }}>Ask your admin to invite the email shown below. Once invited, check again to join your team.</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void retry()} style={[s.submit, busy && { opacity: .6 }]}>{busy ? <ActivityIndicator color={C.onGreen} /> : <Text style={s.submitText}>Check invitation</Text>}</Pressable>
        <Pressable accessibilityRole="button" onPress={() => onChoose('admin')} style={s.back}><Text style={s.backText}>I’m an admin instead</Text></Pressable>
      </View> : <View style={{ gap: 14 }}>
        {([{ role: 'employee', title: 'Employee', description: 'Join your team, view shifts, and track your hours.', Icon: UsersRound }, { role: 'admin', title: 'Admin', description: 'Create a workspace, invite your team, and plan shifts.', Icon: Building2 }] as const).map(({ role, title, description, Icon }) => <Pressable key={role} accessibilityRole="button" accessibilityLabel={title} onPress={() => onChoose(role)} style={({ pressed }) => ({ padding: 22, minHeight: 126, borderRadius: 18, backgroundColor: pressed ? C.mint : C.surface, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 16 })}>
          <Icon size={25} color={C.green} /><View style={{ flex: 1 }}><Text style={{ color: C.ink, fontSize: 19, fontWeight: '500' }}>{title}</Text><Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 7 }}>{description}</Text></View><ArrowRight size={18} color={C.green} />
        </Pressable>)}
      </View>}
      <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 24 }}>Signed in as {email}</Text>
      <Pressable accessibilityRole="button" onPress={() => void onSignOut()} style={s.back}><Text style={s.backText}>Use another Google account</Text></Pressable>
    </AuthMotion>
  </AuthLayout>;
}
