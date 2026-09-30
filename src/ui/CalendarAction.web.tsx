import { CalendarPlus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { addShiftToCalendar, CalendarProvider } from '../lib/calendar';
import type { Shift } from '../lib/data';
import { Button, Card } from './components';
import { C } from './theme';

export function CalendarAction({ shift }: { shift: Shift }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const select = (provider: CalendarProvider) => {
    void addShiftToCalendar(shift, provider).then(() => { setOpen(false); setError(''); }).catch(cause => setError(cause instanceof Error ? cause.message : 'Could not open your calendar.'));
  };
  return <View style={{ marginTop: 11 }}>
    <Button label="Add to calendar" variant="outline" icon={<CalendarPlus size={17} color={C.green} />} onPress={() => setOpen(value => !value)} />
    {open && <Card style={{ marginTop: 9, padding: 13 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}><Text style={{ color: C.ink, fontWeight: '700' }}>Choose your calendar</Text><Pressable accessibilityLabel="Close calendar options" onPress={() => setOpen(false)}><X size={18} color={C.muted} /></Pressable></View><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button label="Google" small variant="light" onPress={() => select('google')} /></View><View style={{ flex: 1 }}><Button label="Outlook" small variant="light" onPress={() => select('outlook')} /></View></View>{!!error && <Text style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{error}</Text>}</Card>}
  </View>;
}
