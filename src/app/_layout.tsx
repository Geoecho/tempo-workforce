import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FeedbackProvider } from '../lib/feedback';
import { ShiftReminders } from '../lib/ShiftReminders';
import { WatchSync } from '../lib/WatchSync';
import { StoreProvider } from '../lib/store';
import { LanguageProvider } from '../lib/i18n';
import { WebBrandHead } from '../ui/WebBrandHead';

function AppStack() { return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#F7F7F5' } }}>
  <Stack.Screen name="index" options={{ animation: 'none' }} />
  <Stack.Screen name="schedule" options={{ animation: 'none' }} />
  <Stack.Screen name="team" options={{ animation: 'none' }} />
  <Stack.Screen name="scan" options={{ animation: 'none' }} />
  <Stack.Screen name="time" options={{ animation: 'none' }} />
  <Stack.Screen name="settings" options={{ animation: 'none' }} />
  <Stack.Screen name="welcome" options={{ animation: 'none' }} />
  <Stack.Screen name="start" options={{ animation: 'none' }} />
</Stack>; }

function AppContent() {
  const pathname = usePathname();
  if (pathname === '/welcome' || pathname === '/start') return <><StatusBar style="dark" /><AppStack /></>;
  return <StoreProvider><StatusBar style="dark" /><AppStack /><ShiftReminders /><WatchSync /></StoreProvider>;
}

export default function Layout() { return <SafeAreaProvider><LanguageProvider><FeedbackProvider><WebBrandHead /><AppContent /></FeedbackProvider></LanguageProvider></SafeAreaProvider>; }
