import * as Calendar from 'expo-calendar/legacy';
import type { Shift } from './data';

export type CalendarProvider = 'google' | 'outlook';

export function calendarDates(shift: Shift) {
  const startDate = new Date(`${shift.date}T${shift.start}:00`);
  const endDate = new Date(`${shift.date}T${shift.end}:00`);
  if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);
  return { startDate, endDate };
}

export async function addShiftToCalendar(shift: Shift, _provider?: CalendarProvider): Promise<void> {
  if (!(await Calendar.isAvailableAsync())) throw new Error('No calendar is available on this device.');
  const { startDate, endDate } = calendarDates(shift);
  await Calendar.createEventInCalendarAsync({
    title: shift.title,
    startDate,
    endDate,
    location: [shift.site, shift.location].filter(Boolean).join(' · '),
    notes: `Tempo shift · ${shift.team}`,
  });
}
