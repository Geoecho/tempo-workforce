import { RotateCcw, ShieldCheck, UserRound } from 'lucide-react-native';
import React from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { Currency } from '../lib/data';
import { useStore } from '../lib/store';
import { Avatar, Card, Screen, Section } from '../ui/components';
import { C } from '../ui/theme';

const currencies: Currency[] = ['PLN', 'EUR', 'USD', 'GBP'];
export default function Settings() {
  const { role, setRole, selectedWorkerId, setSelectedWorker, workers, currency, setCurrency, punches, reset } = useStore();
  const current = workers.find(w => w.id === selectedWorkerId) ?? workers[0];
  const confirmReset = () => {
    if (Platform.OS === 'web') { if (window.confirm('Reset all local demo data on this device?')) reset(); return; }
    Alert.alert('Reset demo?', 'This clears all workers, shifts, and clock events created on this device.', [{ text: 'Cancel' }, { text: 'Reset', style: 'destructive', onPress: reset }]);
  };
  return <Screen title="Workspace" subtitle="Settings for this prototype.">
    <Card style={{ flexDirection: 'row', alignItems: 'center' }}><Avatar worker={current} size={50} /><View style={{ marginLeft: 14 }}><Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>{role === 'admin' ? 'Tempo workspace' : current.name}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{role === 'admin' ? 'Organization admin' : current.role}</Text></View></Card>
    <Section title="View as" /><Text style={{ color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 13 }}>Switch roles to explore both sides of the workflow.</Text>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Pressable onPress={() => setRole('admin')} style={{ flex: 1 }}><Card style={{ borderColor: role === 'admin' ? C.green : C.line, backgroundColor: role === 'admin' ? C.mint : C.surface }}><ShieldCheck size={21} color={C.green} /><Text style={{ color: C.ink, fontWeight: '700', marginTop: 13 }}>Admin</Text><Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>Plan & oversee</Text></Card></Pressable>
      <Pressable onPress={() => setRole('worker')} style={{ flex: 1 }}><Card style={{ borderColor: role === 'worker' ? C.green : C.line, backgroundColor: role === 'worker' ? C.mint : C.surface }}><UserRound size={21} color={C.green} /><Text style={{ color: C.ink, fontWeight: '700', marginTop: 13 }}>Worker</Text><Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>Shifts & hours</Text></Card></Pressable>
    </View>
    {role === 'worker' && <><Section title="Demo worker" /><Card style={{ padding: 0, overflow: 'hidden' }}>{workers.map((w, i) => <Pressable key={w.id} onPress={() => setSelectedWorker(w.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 13, borderTopWidth: i ? 1 : 0, borderColor: C.line }}><Avatar worker={w} size={35} /><Text style={{ flex: 1, marginLeft: 11, color: C.ink, fontWeight: '600' }}>{w.name}</Text><View style={{ width: 18, height: 18, borderRadius: 9, borderColor: C.green, borderWidth: 1.5, backgroundColor: selectedWorkerId === w.id ? C.green : 'transparent' }} /></Pressable>)}</Card></>}
    {role === 'admin' && <><Section title="Pay currency" /><Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginBottom: 11 }}>Set before recording time. The currency locks after the first clock event so old pay records are not relabeled.</Text><View style={{ flexDirection: 'row', gap: 8 }}>{currencies.map(item => <Pressable key={item} disabled={!!punches.length} onPress={() => setCurrency(item)} style={{ backgroundColor: currency === item ? C.green : C.surface, borderWidth: 1, borderColor: currency === item ? C.green : C.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, opacity: punches.length && currency !== item ? .45 : 1 }}><Text style={{ color: currency === item ? '#fff' : C.ink, fontWeight: '700', fontSize: 12 }}>{item}</Text></Pressable>)}</View></>}
    <Section title="About this demo" /><Card><Text style={{ color: C.ink, fontWeight: '700' }}>Built for every kind of crew</Text><Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 7 }}>Events, warehouses, factories, field services, and any team working across shifts and sites.</Text><View style={{ height: 1, backgroundColor: C.line, marginVertical: 17 }} /><Text style={{ color: C.muted, fontSize: 12, lineHeight: 18 }}>This prototype saves data in this browser. Real payroll requires accounts, server verified QR codes and timestamps, manager approvals, and shared records.</Text></Card>
    <Pressable onPress={confirmReset} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 27, padding: 5 }}><RotateCcw size={17} color={C.red} /><Text style={{ color: C.red, fontWeight: '700', fontSize: 13 }}>Reset demo data</Text></Pressable>
  </Screen>;
}
