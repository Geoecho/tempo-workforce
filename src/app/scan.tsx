import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { CheckCircle2, Flashlight, FlashlightOff, QrCode, ScanLine, XCircle } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { formatMoney, hoursLabel, payTimeLabel, PaySummary, qrPayload, today } from '../lib/data';
import { useFeedback } from '../lib/feedback';
import { useStore } from '../lib/store';
import { useLanguage } from '../lib/i18n';
import { Button, Card, Screen, Section } from '../ui/components';
import { C } from '../ui/theme';

type ScanResult = { ok: boolean; message: string; type?: 'in' | 'out'; pay?: PaySummary };
export default function Scan() {
  const { t } = useLanguage();
  const { play } = useFeedback();
  const { role, shifts, punches, selectedWorkerId, scan, currency, online } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const locked = useRef(false);
  const process = async (value: string, source: 'qr' | 'demo' = 'qr') => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    let response: ScanResult;
    try { response = await scan(value, source); }
    catch { response = { ok: false, message: 'Could not reach the shared database. Try again.' }; }
    setResult(response);
    setBusy(false);
    play(response.ok ? 'confirm' : 'decline');
  };
  const assigned = shifts.filter(s => !s.archived && s.workerIds.includes(selectedWorkerId) && s.date === today());
  const latestByShift = new Map(punches.filter(p => p.workerId === selectedWorkerId).sort((a, b) => a.at.localeCompare(b.at)).map(p => [p.shiftId, p]));
  const current = shifts.find(s => !s.archived && s.workerIds.includes(selectedWorkerId) && latestByShift.get(s.id)?.type === 'in');
  const nextAction = current ? 'Ready to check out' : assigned.length === 1 ? 'Ready to check in' : 'Ready to scan';
  if (role !== 'worker') return <Screen title="Worker view required"><Text style={{ color: C.muted, marginBottom: 20 }}>Switch to worker view to scan a site code.</Text><Button label="Open workspace settings" onPress={() => router.push('/settings')} /></Screen>;
  return <Screen title="Scan site code" subtitle="Scan the live QR code shown by your site lead.">
    <Card style={{ backgroundColor: current ? C.mint : C.surface, marginBottom: 16, padding: 16 }}><Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: .7 }}>YOUR STATUS</Text><Text style={{ color: C.ink, fontSize: 19, fontWeight: '700', marginTop: 5 }}>{nextAction}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{current ? `You’re active at ${current.site}. Scan that shift’s code when you leave.` : assigned.length ? `You have ${assigned.length} shift${assigned.length === 1 ? '' : 's'} today. Scan your shift’s code when you arrive.` : 'No shift is assigned today. Ask your site lead if this is unexpected.'}</Text></Card>
    {result ? <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: result.ok ? C.mint : '#F8E8E4', alignItems: 'center', justifyContent: 'center' }}>{result.ok ? <CheckCircle2 color={C.green} size={32} /> : <XCircle color={C.red} size={32} />}</View>
      <Text style={{ color: C.ink, fontSize: 20, fontWeight: '700', marginTop: 17 }}>{t(result.ok ? result.type === 'out' ? 'Shift complete' : 'You’re checked in' : 'Could not scan')}</Text>
      <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 }}>{result.message}</Text>
      {result.ok && <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 9 }}>A 45-second pause protects against accidental double scans.</Text>}
      {result.pay && <View style={{ width: '100%', backgroundColor: C.mint, borderRadius: 15, padding: 18, marginTop: 21 }}><Text style={{ color: C.green, fontSize: 11, fontWeight: '700' }}>ESTIMATED PAY TODAY</Text><Text style={{ color: C.green, fontSize: 29, fontWeight: '700', marginTop: 6 }}>{formatMoney(result.pay.earningsCents, currency)}</Text><Text style={{ color: C.green, fontSize: 12, marginTop: 4 }}>{payTimeLabel(result.pay.payableSeconds)} payable · 10h daily maximum</Text>{result.pay.excessMinutes > 0 && <Text style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{hoursLabel(result.pay.excessMinutes)} over the cap needs manager review.</Text>}</View>}
      <View style={{ width: '100%', marginTop: 23 }}><Button label={result.ok ? 'Done' : 'Try again'} variant={result.ok ? 'primary' : 'light'} onPress={() => { if (result.ok) router.replace('/'); else { locked.current = false; setResult(null); } }} /></View>
    </Card> : <>
      <View style={{ height: 310, borderRadius: 20, overflow: 'hidden', backgroundColor: '#26352F', justifyContent: 'center', alignItems: 'center' }}>
        {permission?.granted ? <CameraView style={{ position: 'absolute', width: '100%', height: '100%' }} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={busy ? undefined : ({ data }) => process(data)} /> : <View style={{ alignItems: 'center', padding: 22 }}><ScanLine size={44} color="#CFE5D8" /><Text style={{ color: '#fff', textAlign: 'center', marginTop: 13, fontWeight: '700' }}>{t('Camera access is needed to scan')}</Text><View style={{ marginTop: 17 }}><Button label={permission?.canAskAgain === false ? 'Open camera settings' : 'Allow camera'} small variant="light" onPress={() => { if (permission?.canAskAgain === false) Linking.openSettings(); else requestPermission(); }} /></View></View>}
        {permission?.granted && <><View pointerEvents="none" style={{ width: 190, height: 190, borderWidth: 3, borderColor: '#D6F4E1', borderRadius: 22 }} /><Pressable accessibilityRole="button" accessibilityLabel={torch ? 'Turn off flashlight' : 'Turn on flashlight'} onPress={() => setTorch(value => !value)} style={{ position: 'absolute', bottom: 15, right: 16, borderRadius: 25, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#163D32CC' }}>{torch ? <FlashlightOff size={21} color="#fff" /> : <Flashlight size={21} color="#fff" />}</Pressable></>}
        {busy && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#163D32CC', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" size="large" /><Text style={{ color: '#fff', fontWeight: '700', marginTop: 12 }}>{t('Checking code…')}</Text></View>}
      </View>
      <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 14 }}>{t('Hold the QR code inside the frame. It scans automatically.')}</Text>
      {!online && <><Section title="Try it on this device" /><Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>Tap a shift to simulate scanning its live QR code. Pay stops accruing after 10 hours today.</Text>
      {assigned.length ? assigned.map(s => <Pressable key={s.id} onPress={() => process(qrPayload(s.id), 'demo')}><Card style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}><View style={{ backgroundColor: C.mint, borderRadius: 11, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}><QrCode color={C.green} size={19} /></View><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{s.title}</Text><Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{s.site}</Text></View></Card></Pressable>) : <Card><Text style={{ color: C.muted }}>No shifts assigned today.</Text></Card>}</>}
    </>}
  </Screen>;
}
