import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { Shift } from './data';

const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const stamp = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;

export function shiftCalendarEvent(shift: Shift): string {
  const endDate = new Date(`${shift.date}T12:00:00`);
  if (shift.end <= shift.start) endDate.setDate(endDate.getDate() + 1);
  const finish = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tempo//Workforce//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:shift-${escape(shift.id)}@tempo-workforce`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${stamp(shift.date, shift.start)}`, `DTEND:${stamp(finish, shift.end)}`,
    `SUMMARY:${escape(shift.title)}`, `LOCATION:${escape([shift.site, shift.location].filter(Boolean).join(' · '))}`,
    `DESCRIPTION:${escape(`Tempo shift · ${shift.team}`)}`, 'END:VEVENT', 'END:VCALENDAR', '',
  ];
  return lines.join('\r\n');
}

export async function addShiftToCalendar(shift: Shift): Promise<void> {
  const contents = shiftCalendarEvent(shift);
  const name = `tempo-${shift.date}-${shift.id.replace(/[^a-zA-Z0-9-]/g, '')}.ics`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, name);
  file.write(contents);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/calendar', dialogTitle: 'Add shift to calendar', UTI: 'public.ics' });
}
