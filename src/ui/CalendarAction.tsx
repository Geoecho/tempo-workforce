import { CalendarPlus } from 'lucide-react-native';
import React from 'react';
import { Alert, View } from 'react-native';
import { addShiftToCalendar } from '../lib/calendar';
import type { Shift } from '../lib/data';
import { Button } from './components';
import { C } from './theme';

export function CalendarAction({ shift }: { shift: Shift }) {
  return <View style={{ marginTop: 11 }}><Button label="Add to calendar" variant="outline" icon={<CalendarPlus size={17} color={C.green} />} onPress={() => void addShiftToCalendar(shift).catch(error => Alert.alert('Calendar unavailable', error instanceof Error ? error.message : 'Could not open your calendar.'))} /></View>;
}
