import type { Shift } from './data';

export type CalendarProvider = 'google' | 'outlook';

export function calendarDates(shift: Shift) {
  const startDate = new Date(`${shift.date}T${shift.start}:00`);
  const endDate = new Date(`${shift.date}T${shift.end}:00`);
  if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);
  return { startDate, endDate };
}

export function calendarUrl(shift: Shift, provider: CalendarProvider): string {
  const { startDate, endDate } = calendarDates(shift);
  const location = [shift.site, shift.location].filter(Boolean).join(' · ');
  if (provider === 'google') {
    const params = new URLSearchParams({
      action: 'TEMPLATE', text: shift.title,
      dates: `${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
      location, details: `Tempo shift · ${shift.team}`,
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }
  const params = new URLSearchParams({
    subject: shift.title, startdt: startDate.toISOString(), enddt: endDate.toISOString(),
    location, body: `Tempo shift · ${shift.team}`,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

export async function addShiftToCalendar(shift: Shift, provider: CalendarProvider = 'google'): Promise<void> {
  const opened = window.open(calendarUrl(shift, provider), '_blank');
  if (!opened) throw new Error('Your browser blocked the calendar tab. Allow pop-ups and try again.');
  opened.opener = null;
}
