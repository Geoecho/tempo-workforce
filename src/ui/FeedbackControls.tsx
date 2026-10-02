import { useWatchDebug } from '../lib/WatchSync';

import { BellRing, Smartphone, Volume2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, Platform, Switch, View } from 'react-native';
import { Pressable } from './LocalizedPressable';
import { Text } from './LocalizedText';
import { useFeedback } from '../lib/feedback';
import { Card, Section } from './components';
import { useTheme } from './theme';

function SettingRow({ icon, title, detail, value, onChange, disabled = false }: {
  icon: React.ReactNode; title: string; detail: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean;
}) {
  const C = useTheme().colors;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
    <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: C.mint }}>{icon}</View>
    <View style={{ flex: 1 }}><Text style={{ color: C.ink, fontSize: 13, fontWeight: '500' }}>{title}</Text><Text style={{ color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }}>{detail}</Text></View>
    <Switch accessibilityLabel={title} value={value} onValueChange={onChange} disabled={disabled} trackColor={{ false: '#DADFDA', true: '#8DC6A3' }} thumbColor={value ? C.green : '#FFFFFF'} />
  </View>;
}

export function FeedbackControls({ worker }: { worker: boolean }) {
  const watchDebug = useWatchDebug();
  const C = useTheme().colors;
  const { haptics, sounds, reminders, setHaptics, setSounds, setReminders, play } = useFeedback();
  const [message, setMessage] = useState('');
  return <>
    <Section title="Feel & alerts" />
    <Card style={{ paddingVertical: 5 }}>
      <SettingRow icon={<Smartphone size={18} color={C.green} />} title="Tap feedback" detail="Light haptics for tabs and actions." value={haptics} onChange={setHaptics} />
      <View style={{ height: 1, backgroundColor: C.line }} />
      <SettingRow icon={<Volume2 size={18} color={C.green} />} title="Confirmation sounds" detail="Soft tones for successful or failed scans. Respects Silent Mode." value={sounds} onChange={setSounds} />
      {sounds && <Pressable accessibilityRole="button" onPress={() => play('confirm')} style={{ alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 48 }}><Text style={{ color: C.green, fontSize: 12, fontWeight: '500' }}>Play sample</Text></Pressable>}
      {worker && <><View style={{ height: 1, backgroundColor: C.line }} /><SettingRow icon={<BellRing size={18} color={C.green} />} title="Shift reminders" detail={Platform.OS === 'web' ? 'Available in the iOS and Android app.' : 'A quiet reminder one hour before each shift.'} value={reminders} disabled={Platform.OS === 'web'} onChange={value => { void setReminders(value).then(ok => { setMessage(ok ? '' : 'Notifications are off for Tempo in your phone settings.'); }); }} /></>}
      {!!message && <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={{ paddingBottom: 12 }}><Text style={{ color: C.red, fontSize: 12, lineHeight: 18 }}>{message} Open settings</Text></Pressable>}
    </Card>
    <Text style={{ color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 10 }}>{watchDebug}</Text>
  </>;
}
