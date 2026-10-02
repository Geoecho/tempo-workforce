import Head from 'expo-router/head';
import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useTheme } from './theme';
export function WebBrandHead() {
  const { colors: C, scheme } = useTheme();
  const pathname = usePathname();
  const chromeColor = pathname === '/welcome' || pathname === '/start' ? C.bg : C.surface;
  useEffect(() => {
    document.documentElement.style.setProperty('--tempo-chrome-bg', chromeColor);
  }, [chromeColor]);
  return <Head><title>Tempo</title><meta name="theme-color" content={chromeColor} /><meta name="apple-mobile-web-app-status-bar-style" content={scheme === 'dark' ? 'black-translucent' : 'default'} /><meta name="apple-mobile-web-app-title" content="Tempo" /><meta name="description" content="Every shift, in sync. Plan your team, track hours, and keep pay clear with Tempo." /><link rel="apple-touch-icon" href="/apple-touch-icon.png" /><link rel="manifest" href="/manifest.webmanifest" /></Head>;
}
