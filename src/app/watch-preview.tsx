import { BrandLogo } from '../ui/Brand';
import { LinearGradient } from 'expo-linear-gradient';
import { BellRing, Check, ChevronRight, Clock3, MapPin, ScanLine, Watch } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/LocalizedPressable';
import { Text } from '../ui/LocalizedText';
import { formatDay, today } from '../lib/data';
import { useFeedback } from '../lib/feedback';
import { useStore } from '../lib/store';
import { Card, Screen, Section } from '../ui/components';
import { C } from '../ui/theme';

type WatchState = 'upcoming' | 'active' | 'complete';
const accent = '#D5E2CB';

export default function WatchPreview() {
  const { selectedWorkerId, workers, shifts } = useStore();
  const { play } = useFeedback();
  const [state, setState] = useState<WatchState>('upcoming');
  const [notice, setNotice] = useState('');
  const workerId = selectedWorkerId || workers.find(worker => !worker.archived)?.id;
  const shift = shifts.filter(item => !item.archived && item.workerIds.includes(workerId ?? '') && item.date >= today()).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))[0];
  const site = shift?.site ?? 'Northline Festival';
  const title = shift?.title ?? 'Main stage setup';
  const start = shift?.start ?? '09:00';
  const day = shift ? formatDay(shift.date) : 'Today';
  const select = (next: WatchState) => { play('select'); setNotice(''); setState(next); };

  return <Screen back noNav title="Tempo on your wrist" subtitle="A worker-first Apple Watch concept. Choose a moment to explore the screen.">
    <View style={{ flexDirection: 'row', gap: 7, marginBottom: 22 }}>
      {([
        ['upcoming', 'Before shift'], ['active', 'On shift'], ['complete', 'Finished'],
      ] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: state === key }} onPress={() => select(key)} style={{ flex: 1, minHeight: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: state === key ? C.green : C.surface, borderWidth: 1, borderColor: state === key ? C.green : C.line, paddingHorizontal: 4 }}><Text style={{ color: state === key ? '#FFFFFF' : C.muted, fontSize: 11, fontWeight: '500', textAlign: 'center' }}>{label}</Text></Pressable>)}
    </View>

    <View style={{ alignItems: 'center', marginBottom: 18 }}>
      <View style={{ width: 258, height: 306, backgroundColor: '#2A302E', borderRadius: 69, padding: 9, shadowColor: '#0A1A12', shadowOpacity: .22, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 14 }}>
        <View style={{ position: 'absolute', width: 8, height: 44, borderTopRightRadius: 8, borderBottomRightRadius: 8, right: -7, top: 102, backgroundColor: '#303937' }} />
        <LinearGradient colors={['#143127', '#07130F', '#030807']} style={{ flex: 1, borderRadius: 61, overflow: 'hidden', paddingHorizontal: 21, paddingTop: 18, paddingBottom: 18, justifyContent: 'space-between' }}>
          <View pointerEvents="none" style={{ position: 'absolute', width: 165, height: 165, borderRadius: 100, borderWidth: 34, borderColor: '#27564044', top: 40, right: -86 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><BrandLogo size={15} color="#E6EDDF" /><Text style={{ color: '#A2B5A7', fontSize: 12, fontWeight: '500' }}>9:41</Text></View>

          {state === 'upcoming' && <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}><Clock3 size={12} color={accent} /><Text style={{ color: accent, fontSize: 10, letterSpacing: 1.3, fontWeight: '600' }}>NEXT SHIFT</Text></View>
            <Text style={{ color: '#FFFFFF', fontSize: 38, lineHeight: 44, fontWeight: '600', letterSpacing: -1.8 }}>{start}</Text>
            <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500', marginTop: 5 }}>{title}</Text>
            <Text numberOfLines={1} style={{ color: '#9DB3A5', fontSize: 12, marginTop: 4 }}>{day} · {site}</Text>
          </View>}
          {state === 'active' && <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: accent }} /><Text style={{ color: accent, fontSize: 10, letterSpacing: 1.3, fontWeight: '600' }}>ON SHIFT</Text></View>
            <Text style={{ color: '#FFFFFF', fontSize: 35, lineHeight: 42, fontWeight: '600', letterSpacing: -1.8 }}>03h 24m</Text>
            <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500', marginTop: 5 }}>{site}</Text>
            <Text style={{ color: '#9DB3A5', fontSize: 12, marginTop: 4 }}>Since {start}</Text>
          </View>}
          {state === 'complete' && <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 9 }}><Check size={13} color={accent} /><Text style={{ color: accent, fontSize: 10, letterSpacing: 1.3, fontWeight: '600' }}>SHIFT COMPLETE</Text></View>
            <Text style={{ color: '#FFFFFF', fontSize: 34, lineHeight: 42, fontWeight: '600', letterSpacing: -1.8 }}>08h 00m</Text>
            <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500', marginTop: 5 }}>Nice work.</Text>
            <Text style={{ color: '#9DB3A5', fontSize: 12, marginTop: 4 }}>Your hours are recorded</Text>
          </View>}

          <Pressable accessibilityRole="button" onPress={() => { play('select'); setNotice(state === 'complete' ? 'On a real watch, this opens your next shift.' : 'On a real watch, this opens the QR scanner on your paired iPhone.'); }} style={{ minHeight: 47, backgroundColor: accent, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 }}>
            {state === 'complete' ? <Clock3 size={16} color="#123426" /> : <ScanLine size={16} color="#123426" />}
            <Text style={{ color: '#123426', fontSize: 12, fontWeight: '600' }}>{state === 'complete' ? 'Next shift' : 'Scan on iPhone'}</Text>
            <ChevronRight size={14} color="#123426" />
          </Pressable>
        </LinearGradient>
      </View>
    </View>
    {!!notice && <Text style={{ color: C.green, fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 18, marginBottom: 10 }}>{notice}</Text>}
    <Text style={{ color: C.muted, textAlign: 'center', fontSize: 12, lineHeight: 18 }}>One glance for status. One tap to reach the secure phone scan.</Text>

    <Section title="A timely wrist reminder" />
    <Card style={{ backgroundColor: '#0B1511', borderColor: '#0B1511', flexDirection: 'row', alignItems: 'center', gap: 13 }}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#244D35', alignItems: 'center', justifyContent: 'center' }}><BellRing size={19} color={accent} /></View><View style={{ flex: 1 }}><Text style={{ color: '#FFFFFF', fontWeight: '500', fontSize: 13 }}>Shift in 1 hour</Text><Text numberOfLines={1} style={{ color: '#A9C0B1', fontSize: 11, marginTop: 4 }}>{title} · {site}</Text></View><Watch size={16} color="#829D8B" /></Card>
    <Section title="Designed for a quick glance" />
    <Card><View style={{ flexDirection: 'row', gap: 11, alignItems: 'center' }}><MapPin size={18} color={C.green} /><Text style={{ color: C.ink, fontSize: 13, flex: 1 }}>The next shift, live status, and a single clear action fit on one screen.</Text></View></Card>
  </Screen>;
}
