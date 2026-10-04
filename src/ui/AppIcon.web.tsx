import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, History, PanelLeftClose, PanelLeftOpen, QrCode } from 'lucide-react-native';
import { motion } from 'motion/react';
import { ArrowRightIcon } from './animated-icons/arrow-right.web';
import { BellIcon } from './animated-icons/bell.web';
import { CalendarDaysIcon } from './animated-icons/calendar-days.web';
import { ChartLineIcon } from './animated-icons/chart-line.web';
import { HomeIcon } from './animated-icons/home.web';
import { SettingsIcon } from './animated-icons/settings.web';
import { UsersRoundIcon } from './animated-icons/users-round.web';

export type AppIconName = 'home' | 'calendar' | 'upcoming' | 'history' | 'panel-open' | 'panel-close' | 'team' | 'time' | 'settings' | 'scan' | 'bell' | 'arrow-right';
type IconHandle = { startAnimation: () => void; stopAnimation: () => void };
type AnimatedIcon = React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & { size?: number } & React.RefAttributes<IconHandle>>;
const icons: Record<Exclude<AppIconName, 'scan' | 'upcoming' | 'history' | 'panel-open' | 'panel-close'>, AnimatedIcon> = {
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
  if (name === 'upcoming' || name === 'history' || name === 'panel-open' || name === 'panel-close') {
    const Vector = name === 'upcoming' ? CalendarClock : name === 'history' ? History : name === 'panel-open' ? PanelLeftOpen : PanelLeftClose;
    return <motion.div aria-hidden="true" style={{ width: size, height: size, display: 'inline-flex' }} animate={playing && !reducedMotion ? name === 'history' ? { rotate: [0, -35, 0] } : name === 'upcoming' ? { y: [0, -2, 0] } : { x: [0, 2, 0] } : { rotate: 0, x: 0, y: 0 }} transition={{ duration: .45 }}><Vector size={size} color={color} strokeWidth={1.8} /></motion.div>;
  }
  const Icon = icons[name];
  return <Icon ref={handle} size={size} style={{ color, display: 'inline-flex', lineHeight: 0 }} aria-hidden="true" />;
}
