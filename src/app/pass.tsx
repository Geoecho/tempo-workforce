import { useLocalSearchParams } from 'expo-router';
import { Clock3, MapPin, QrCode, ShieldCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import QRCode from 'react-native-qrcode-svg';
import { today } from '../lib/data';
import { openSiteMap } from '../lib/site-location';
import { useStore } from '../lib/store';
import { Card, Pill, Screen } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function Pass() {
  const C = useTheme().colors;
  const { shiftId } = useLocalSearchParams<{ shiftId?: string }>(); const { shifts, role, issueQr, online } = useStore(); const [now, setNow] = useState(0); const [selection, setSelection] = useState<{ routeId?: string; id: string | null }>({ routeId: shiftId, id: shiftId ?? null }); const [code, setCode] = useState(''); const [codeError, setCodeError] = useState('');
  useEffect(() => { const first = setTimeout(() => setNow(Date.now()), 0); const timer = setInterval(() => setNow(Date.now()), 1000); return () => { clearTimeout(first); clearInterval(timer); }; }, []);
  const available = shifts.filter(s => !s.archived && s.date === today()).sort((a, b) => a.site.localeCompare(b.site) || a.start.localeCompare(b.start));
  const picked = selection.routeId === shiftId ? selection.id : shiftId; const shift = available.find(s => s.id === picked); const seconds = 30 - Math.floor(now / 1000) % 30;
  const slot = Math.floor(now / 30000);
  const activeShiftId = shift?.id;
  const clockReady = now !== 0;
  useEffect(() => {
    if (!activeShiftId || !clockReady || role !== 'admin') return;
    let active = true;
    Promise.resolve().then(() => issueQr(activeShiftId)).then(value => { if (active) { setCode(value); setCodeError(''); } }).catch(error => { if (active) { setCode(''); setCodeError(error instanceof Error ? error.message : 'Could not load a site code.'); } });
    return () => { active = false; };
  }, [activeShiftId, slot, issueQr, clockReady, role]);
  if (role !== 'admin') return <Screen back title="Admin only"><Text>This action requires an admin account.</Text></Screen>;
  return <Screen back noNav title="Site check-in code" subtitle={shift ? 'Display this code at the selected entrance.' : 'Choose the exact site and shift before showing a code.'}>
    {shift ? <>
      <Card style={{ alignItems: 'center', paddingVertical: 28 }}><Pill>LIVE CODE</Pill><Text style={{ color: C.ink, fontSize: 20, fontWeight: '500', marginTop: 13, textAlign: 'center' }}>{shift.site}</Text><Text style={{ color: C.muted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>{shift.title} · {shift.start}–{shift.end}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, marginBottom: 23 }}><MapPin size={13} color={C.muted} /><Text style={{ color: C.muted, fontSize: 12 }}>{shift.location}</Text></View><View style={{ padding: 17, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line, minWidth: 241, minHeight: 241, alignItems: 'center', justifyContent: 'center' }}>{code ? <QRCode value={code} size={205} color="#254E3D" backgroundColor="#FFFFFF" /> : <Text style={{ color: '#374A3D', textAlign: 'center' }}>{codeError || 'Loading secure code…'}</Text>}</View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 23 }}><Clock3 color={C.green} size={16} /><Text style={{ color: C.green, fontWeight: '500', fontSize: 13 }}>Refreshes in {seconds}s</Text></View></Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 17, gap: 10, paddingHorizontal: 5 }}><ShieldCheck color={C.green} size={18} /><Text style={{ flex: 1, color: C.muted, fontSize: 12, lineHeight: 18 }}>{online ? 'This server-issued code expires shortly and works only for assigned workers.' : 'Only assigned workers can use this code.'} Keep the display online and at this entrance.</Text></View>
      <View style={{ flexDirection: 'row', gap: 18, marginTop: 18 }}><Pressable accessibilityRole="button" onPress={() => void openSiteMap(shift)}><Text style={{ color: C.green, fontSize: 13, fontWeight: '500' }}>View site on map</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setSelection({ routeId: shiftId, id: null }); setCode(''); }}><Text style={{ color: C.green, fontSize: 13, fontWeight: '500' }}>Change site or shift</Text></Pressable></View>
    </> : available.length ? <>{available.map(s => <Pressable key={s.id} accessibilityRole="button" onPress={() => { setCode(''); setSelection({ routeId: shiftId, id: s.id }); }}><Card style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 9 }}><View style={{ width: 38, height: 38, backgroundColor: C.mint, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}><QrCode color={C.green} size={18} /></View><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: C.ink, fontWeight: '500', fontSize: 14 }}>{s.site}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{s.title} · {s.start}–{s.end}</Text><Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{s.location}</Text></View></Card></Pressable>)}</> : <Card><Text>No shifts today. Create or reschedule a shift for today first.</Text></Card>}
  </Screen>;
}
