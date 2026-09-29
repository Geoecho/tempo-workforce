import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { CheckCircle2, QrCode, ScanLine, XCircle } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatMoney, hoursLabel, payTimeLabel, PaySummary, qrPayload, today } from '../lib/data';
import { useStore } from '../lib/store';
import { Button, Card, Screen, Section } from '../ui/components';
import { C } from '../ui/theme';

type ScanResult = { ok: boolean; message: string; type?: 'in' | 'out'; pay?: PaySummary };
export default function Scan() {
  const { role, shifts, selectedWorkerId, scan, currency } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<ScanResult | null>(null);
  const locked = useRef(false);
  const process = (value: string, source: 'qr' | 'demo' = 'qr') => {
    if (locked.current) return;
    locked.current = true;
    const response = scan(value, source);
    setResult(response);
    Haptics.notificationAsync(response.ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
  };
  const assigned = shifts.filter(s => !s.archived && s.workerIds.includes(selectedWorkerId) && s.date === today());
  if (role !== 'worker') return <Screen title="Worker view required"><Text style={{ color: C.muted, marginBottom: 20 }}>Switch to worker view to scan a site code.</Text><Button label="Open workspace settings" onPress={() => router.push('/settings')} /></Screen>;
  return <Screen title="Scan site code" subtitle="Point your camera at the QR code displayed by your site lead.">
    {result ? <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: result.ok ? C.mint : '#F8E8E4', alignItems: 'center', justifyContent: 'center' }}>{result.ok ? <CheckCircle2 color={C.green} size={32} /> : <XCircle color={C.red} size={32} />}</View>
      <Text style={{ color: C.ink, fontSize: 20, fontWeight: '700', marginTop: 17 }}>{result.ok ? result.type === 'out' ? 'Shift complete' : 'You’re checked in' : 'Could not scan'}</Text>
      <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 }}>{result.message}</Text>
      {result.pay && <View style={{ width: '100%', backgroundColor: C.mint, borderRadius: 15, padding: 18, marginTop: 21 }}><Text style={{ color: C.green, fontSize: 11, fontWeight: '700' }}>ESTIMATED PAY TODAY</Text><Text style={{ color: C.green, fontSize: 29, fontWeight: '700', marginTop: 6 }}>{formatMoney(result.pay.earningsCents, currency)}</Text><Text style={{ color: C.green, fontSize: 12, marginTop: 4 }}>{payTimeLabel(result.pay.payableSeconds)} payable · 10h daily maximum</Text>{result.pay.excessMinutes > 0 && <Text style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{hoursLabel(result.pay.excessMinutes)} over the cap needs manager review.</Text>}</View>}
      <View style={{ width: '100%', marginTop: 23 }}><Button label="Scan another code" variant="light" onPress={() => { locked.current = false; setResult(null); }} /></View>
    </Card> : <>
      <View style={{ height: 292, borderRadius: 20, overflow: 'hidden', backgroundColor: '#26352F', justifyContent: 'center', alignItems: 'center' }}>
        {permission?.granted ? <CameraView style={{ position: 'absolute', width: '100%', height: '100%' }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => process(data)} /> : <View style={{ alignItems: 'center', padding: 22 }}><ScanLine size={44} color="#CFE5D8" /><Text style={{ color: '#fff', textAlign: 'center', marginTop: 13, fontWeight: '700' }}>Camera access is needed to scan</Text><View style={{ marginTop: 17 }}><Button label="Allow camera" small variant="light" onPress={() => requestPermission()} /></View></View>}
        <View pointerEvents="none" style={{ width: 190, height: 190, borderWidth: 3, borderColor: '#D6F4E1', borderRadius: 22 }} />
      </View>
      <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 14 }}>Align the code inside the frame</Text>
      <Section title="Try it on this device" /><Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>Tap a shift to simulate scanning its live QR code. Pay stops accruing after 10 hours today.</Text>
      {assigned.length ? assigned.map(s => <Pressable key={s.id} onPress={() => process(qrPayload(s.id), 'demo')}><Card style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}><View style={{ backgroundColor: C.mint, borderRadius: 11, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}><QrCode color={C.green} size={19} /></View><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{s.title}</Text><Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{s.site}</Text></View></Card></Pressable>) : <Card><Text style={{ color: C.muted }}>No shifts assigned today.</Text></Card>}
    </>}
  </Screen>;
}
