import { ArrowRight, Bell, CalendarDays, ChartNoAxesCombined, House, QrCode, Settings2, UsersRound } from 'lucide-react-native';
import React from 'react';

export type AppIconName = 'home' | 'calendar' | 'team' | 'time' | 'settings' | 'scan' | 'bell' | 'arrow-right';
const icons = { home: House, calendar: CalendarDays, team: UsersRound, time: ChartNoAxesCombined, settings: Settings2, scan: QrCode, bell: Bell, 'arrow-right': ArrowRight };

export function AppIcon({ name, size = 20, color = '#164B3B' }: { name: AppIconName; size?: number; color?: string; playing?: boolean }) {
  const Icon = icons[name];
  return <Icon size={size} color={color} />;
}
