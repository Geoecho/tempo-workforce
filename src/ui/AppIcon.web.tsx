import React, { useEffect, useRef, useState } from 'react';
import { QrCode } from 'lucide-react-native';
import { ArrowRightIcon } from './animated-icons/arrow-right.web';
import { BellIcon } from './animated-icons/bell.web';
import { CalendarDaysIcon } from './animated-icons/calendar-days.web';
import { ChartLineIcon } from './animated-icons/chart-line.web';
import { HomeIcon } from './animated-icons/home.web';
import { SettingsIcon } from './animated-icons/settings.web';
import { UsersRoundIcon } from './animated-icons/users-round.web';

export type AppIconName = 'home' | 'calendar' | 'team' | 'time' | 'settings' | 'scan' | 'bell' | 'arrow-right';
type IconHandle = { startAnimation: () => void; stopAnimation: () => void };
type AnimatedIcon = React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { size?: number } & React.RefAttributes<IconHandle>>;
const icons: Record<Exclude<AppIconName, 'scan'>, AnimatedIcon> = {
  home: HomeIcon, calendar: CalendarDaysIcon, team: UsersRoundIcon,
  time: ChartLineIcon, settings: SettingsIcon, bell: BellIcon, 'arrow-right': ArrowRightIcon,
};

export function AppIcon({ name, size = 20, color = 'currentColor', playing = false }: { name: AppIconName; size?: number; color?: string; playing?: boolean }) {
  const handle = useRef<IconHandle>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (playing && !reducedMotion) handle.current?.startAnimation();
    else handle.current?.stopAnimation();
  }, [playing, reducedMotion]);
  if (name === 'scan') return <QrCode size={size} color={color} />;
  const Icon = icons[name];
  return <Icon ref={handle} size={size} style={{ color, display: 'inline-flex', lineHeight: 0 }} aria-hidden="true" />;
}
