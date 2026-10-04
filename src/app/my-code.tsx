import { ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { Redirect } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Text } from '../ui/LocalizedText';
import { workerPayload } from '../lib/worker-code';
import { useStore } from '../lib/store';
import { Avatar, Card, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function MyCode() {
  const C = useTheme().colors;
  const { width } = useWindowDimensions();
  const { workers, selectedWorkerId, role } = useStore();
  if (Platform.OS === 'web' && width >= 960) return <Redirect href="/" />;
  const worker = workers.find(w => w.id === selectedWorkerId && !w.archived);
  if (role !== 'worker' || !worker) return <Screen back title="My code"><Text style={{ color: C.muted }}>Open this from a worker account.</Text></Screen>;
  return <Screen back noNav title="Worker ID for managers" subtitle="Identification only. This code does not clock you in.">
    <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
      <Avatar worker={worker} size={56} />
      <Text style={{ color: C.ink, fontSize: 20, fontWeight: '500', marginTop: 12 }}>{worker.name}</Text>
      <Text style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>{worker.role} · {worker.team}</Text>
      <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 18, marginTop: 22 }}><QRCode value={workerPayload(worker.id)} size={220} /></View>
    </Card>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, paddingHorizontal: 4 }}><ShieldCheck color={C.green} size={18} /><Text style={{ flex: 1, color: C.muted, fontSize: 12, lineHeight: 18 }}>This code only identifies you. A manager must scan it to assign you to a shift, and it never clocks you in.</Text></View>
  </Screen>;
}
