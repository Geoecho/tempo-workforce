import { useLocalSearchParams } from 'expo-router';
import { Clock3, QrCode, ShieldCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { qrPayload } from '../lib/data';
import { useStore } from '../lib/store';
import { Card, Pill, Screen } from '../ui/components';
import { C } from '../ui/theme';

export default function Pass() {
  const { shiftId } = useLocalSearchParams<{ shiftId?: string }>(); const { shifts, role } = useStore(); const [now, setNow] = useState(0); const [picked, setPicked] = useState(shiftId ?? shifts[0]?.id);
  useEffect(() => { const first = setTimeout(() => setNow(Date.now()), 0); const timer = setInterval(() => setNow(Date.now()), 1000); return () => { clearTimeout(first); clearInterval(timer); }; }, []);
  const shift = shifts.find(s => s.id === picked) ?? shifts[0]; const seconds = 30 - Math.floor(now / 1000) % 30;
  if (role !== 'admin') return <Screen back title="Admin only"><Text>This action requires an admin account.</Text></Screen>;
  return <Screen back noNav title="Site check-in code" subtitle="Display this at the site entrance for assigned workers.">{shift ? <><Card style={{ alignItems: 'center', paddingVertical: 28 }}><Pill>LIVE CODE</Pill><Text style={{ color: C.ink, fontSize: 20, fontWeight: '700', marginTop: 13 }}>{shift.site}</Text><Text style={{ color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 27 }}>{shift.title}</Text><View style={{ padding: 17, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line }}><QRCode value={qrPayload(shift.id, now)} size={205} color={C.green} backgroundColor="#FFFFFF" /></View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 23 }}><Clock3 color={C.green} size={16} /><Text style={{ color: C.green, fontWeight: '700', fontSize: 13 }}>Refreshes in {seconds}s</Text></View></Card><View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 17, gap: 10, paddingHorizontal: 5 }}><ShieldCheck color={C.green} size={18} /><Text style={{ flex: 1, color: C.muted, fontSize: 12, lineHeight: 18 }}>Only assigned workers can use this code. Each scan alternates between check-in and check-out in this demo.</Text></View><Text style={{ color: C.ink, fontSize: 17, fontWeight: '700', marginTop: 27, marginBottom: 12 }}>Choose a shift</Text>{shifts.map(s => <Pressable key={s.id} onPress={() => setPicked(s.id)}><Card style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderColor: s.id === shift.id ? C.green : C.line }}><View style={{ width: 37, height: 37, backgroundColor: C.mint, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}><QrCode color={C.green} size={18} /></View><View style={{ flex: 1, marginLeft: 11 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{s.title}</Text><Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{s.site}</Text></View></Card></Pressable>)}</> : <Card><Text>No shifts yet. Create a shift first.</Text></Card>}</Screen>;
}
