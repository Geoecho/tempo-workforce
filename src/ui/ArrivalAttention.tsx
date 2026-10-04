import { router } from 'expo-router';
import { ArrowRight, Clock3 } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { Shift, Worker, shiftHasEnded } from '../lib/data';
import { Avatar, Button, Card } from './components';
import { Text } from './LocalizedText';
import { Pressable } from './LocalizedPressable';
import { useTheme } from './theme';

export type ArrivalIssue = { shift: Shift; workers: Worker[] };

export function ArrivalAttention({ issues, now }: { issues: ArrivalIssue[]; now: number }) {
  const C = useTheme().colors;
  if (!issues.length) return null;
  return <Card style={{ marginBottom: 16, padding: 20 }}>
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' }}><Clock3 size={19} color={C.warningText} /></View>
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: C.ink, fontSize: 16, fontWeight: '600' }}>Missing check-ins</Text><Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 3 }}>The shift has started, but these workers have no check-in recorded.</Text></View>
    </View>
    {issues.map(({ shift, workers }) => <View key={shift.id} style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 16, marginTop: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <View style={{ flexGrow: 1, flexBasis: 180, minWidth: 0 }}><Text style={{ fontSize: 15, fontWeight: '600' }}>{shift.title}</Text><Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 4 }}>{shift.site} · {shift.start}–{shift.end}</Text>
          <Text style={{ color: C.warningText, fontSize: 12, marginTop: 5 }}>{shiftHasEnded(shift, now) ? 'Shift ended without a check-in' : <><Text>Started</Text> {Math.floor((now - new Date(`${shift.date}T${shift.start}:00`).getTime()) / 60000)} <Text>min ago</Text></>}</Text>
        </View>
        <Button label="Review shift" small variant="outline" onPress={() => router.push({ pathname: '/shift/[id]', params: { id: shift.id } })} />
      </View>
      {workers.map(worker => <Pressable key={worker.id} accessibilityRole="button" accessibilityLabel={`${worker.name} · Worker details`} onPress={() => router.push({ pathname: '/worker/[id]', params: { id: worker.id } })} style={({ pressed }) => ({ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginTop: 4, backgroundColor: pressed ? C.mint : C.subtle })}>
        <Avatar worker={worker} size={34} /><View style={{ flex: 1, minWidth: 0 }}><Text style={{ fontSize: 14, fontWeight: '500' }}>{worker.name}</Text><Text style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>No check-in recorded</Text></View><ArrowRight size={17} color={C.green} />
      </Pressable>)}
    </View>)}
  </Card>;
}
