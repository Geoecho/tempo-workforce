import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { formatDay, today } from '../lib/data';
import { useFeedback } from '../lib/feedback';
import { useStore } from '../lib/store';
import { parseWorkerPayload } from '../lib/worker-code';
import { Avatar, Button, Card, Empty, Screen, Section } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function ScanWorker() {
  const C = useTheme().colors;
  const { play } = useFeedback();
  const { shiftId } = useLocalSearchParams<{ shiftId?: string }>();
  const { role, shifts, workers, updateShift } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [picked, setPicked] = useState<string | undefined>(shiftId);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const locked = useRef(false);
  const shift = shifts.find(s => s.id === picked && !s.archived);
  if (role !== 'admin') return <Screen back title="Admin only"><Text style={{ color: C.muted }}>Only admins can assign people to shifts.</Text></Screen>;
  const choices = shifts.filter(s => !s.archived && s.date >= today()).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)).slice(0, 12);
  if (!shift) return <Screen back noNav title="Choose a shift" subtitle="Pick the event to assign people to.">
    {choices.length ? choices.map(s => <Pressable key={s.id} accessibilityRole="button" onPress={() => setPicked(s.id)}><Card style={{ marginBottom: 9 }}><Text style={{ color: C.muted, fontSize: 11 }}>{formatDay(s.date)} · {s.start}–{s.end}</Text><Text style={{ color: C.ink, fontSize: 16, fontWeight: '500', marginTop: 4 }}>{s.title}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{s.site}</Text></Card></Pressable>) : <Empty title="No upcoming shifts" detail="Create a shift first." />}
  </Screen>;
  const handle = (data: string) => {
    if (locked.current) return;
    locked.current = true;
    const id = parseWorkerPayload(data);
    const worker = id ? workers.find(w => w.id === id && !w.archived) : undefined;
    let response: { ok: boolean; message: string };
    if (!id) response = { ok: false, message: 'That is not a Tempo worker code.' };
    else if (!worker) response = { ok: false, message: 'This person is not on your team.' };
    else if (shift.workerIds.includes(worker.id)) response = { ok: true, message: `${worker.name} is already on ${shift.title}.` };
    else { updateShift(shift.id, { workerIds: [...shift.workerIds, worker.id] }); response = { ok: true, message: `${worker.name} added to ${shift.title} on ${formatDay(shift.date)}.` }; }
    setResult(response);
    play(response.ok ? 'confirm' : 'decline');
  };
  const assignedPeople = shift.workerIds.map(id => workers.find(w => w.id === id)).filter((w): w is NonNullable<typeof w> => !!w);
  const again = () => { locked.current = false; setResult(null); };
  return <Screen back noNav title="Scan worker" subtitle={`Assign to ${shift.title} · ${formatDay(shift.date)} ${shift.start}–${shift.end}`}>
    {result ? <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: result.ok ? C.mint : C.dangerSurface, alignItems: 'center', justifyContent: 'center' }}>{result.ok ? <CheckCircle2 color={C.green} size={32} /> : <XCircle color={C.red} size={32} />}</View>
      <Text style={{ color: C.ink, fontSize: 18, fontWeight: '500', marginTop: 16, textAlign: 'center' }}>{result.message}</Text>
      <View style={{ width: '100%', marginTop: 22, gap: 10 }}><Button label="Scan next person" onPress={again} /><Button label="Done" variant="outline" onPress={() => router.back()} /></View>
    </Card> : <>
      <View style={{ height: 300, borderRadius: 20, overflow: 'hidden', backgroundColor: '#26352F', justifyContent: 'center', alignItems: 'center' }}>
        {permission?.granted ? <><CameraView style={{ position: 'absolute', width: '100%', height: '100%' }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => handle(data)} /><View pointerEvents="none" style={{ width: 200, height: 200, borderWidth: 3, borderColor: '#D6F4E1', borderRadius: 22 }} /></> : <View style={{ alignItems: 'center', padding: 24, gap: 14 }}><Text style={{ color: '#fff', textAlign: 'center' }}>Camera access is needed to scan a worker ID code.</Text><Button label="Allow camera" variant="light" onPress={() => void requestPermission()} /></View>}
      </View>
      <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 14 }}>Ask the worker to open My ID code in their app, then hold it inside the frame.</Text>
      <Pressable accessibilityRole="button" onPress={() => setPicked(undefined)} style={{ alignItems: 'center', paddingVertical: 14 }}><Text style={{ color: C.green, fontSize: 13, fontWeight: '500' }}>Choose a different shift</Text></Pressable>
    </>}
    <Section title={`On this shift (${assignedPeople.length})`} />
    <Card style={{ padding: 0, overflow: 'hidden' }}>{assignedPeople.length ? assignedPeople.map((w, i) => <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}><Avatar worker={w} size={32} /><View style={{ marginLeft: 11, flex: 1 }}><Text style={{ color: C.ink, fontSize: 13, fontWeight: '500' }}>{w.name}</Text><Text style={{ color: C.muted, fontSize: 11 }}>{w.role}</Text></View></View>) : <Text style={{ color: C.muted, padding: 14, fontSize: 13 }}>Nobody assigned yet.</Text>}</Card>
  </Screen>;
}
