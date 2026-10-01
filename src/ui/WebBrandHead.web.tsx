import Head from 'expo-router/head';
import { useTheme } from './theme';
export function WebBrandHead() {
  const C = useTheme().colors;
  return <Head><title>Tempo</title><meta name="theme-color" content={C.surface} /><meta name="apple-mobile-web-app-title" content="Tempo" /><meta name="description" content="Every shift, in sync. Plan your team, track hours, and keep pay clear with Tempo." /><link rel="apple-touch-icon" href="/apple-touch-icon.png" /><link rel="manifest" href="/manifest.webmanifest" /></Head>;
}
