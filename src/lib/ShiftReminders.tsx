import React, { useEffect, useState } from 'react';
import { notificationsSupported } from './notification-support';

export function ShiftReminders() {
  const [Reminder, setReminder] = useState<React.ComponentType | null>(null);
  useEffect(() => {
    if (!notificationsSupported) return;
    let active = true;
    void import('./NativeShiftReminders').then(module => { if (active) setReminder(() => module.ShiftReminders); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return Reminder ? <Reminder /> : null;
}
