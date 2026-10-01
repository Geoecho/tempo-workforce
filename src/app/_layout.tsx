import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import * as SystemUI from 'expo-system-ui';
import { FeedbackProvider } from '../lib/feedback';
import { ShiftReminders } from '../lib/ShiftReminders';
import { WatchSync } from '../lib/WatchSync';
import { StoreProvider } from '../lib/store';
import { LanguageProvider } from '../lib/i18n';
import { WebBrandHead } from '../ui/WebBrandHead';
import { ThemeProvider, useTheme } from '../ui/theme';

function AppStack() { const C = useTheme().colors; return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: C.bg } }}>
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
  const { scheme, colors: C } = useTheme();
  const pathname = usePathname();
  // Sync Android nav bar / iOS home-indicator background with active theme
  useEffect(() => { void SystemUI.setBackgroundColorAsync(C.bg); }, [C.bg]);
  const statusBar = <StatusBar style={pathname === '/welcome' ? 'dark' : scheme === 'dark' ? 'light' : 'dark'} />;
  return <StoreProvider>{statusBar}<AppStack />{pathname !== '/welcome' && pathname !== '/start' && <><ShiftReminders /><WatchSync /></>}</StoreProvider>;
}

export default function Layout() { return <SafeAreaProvider><ThemeProvider><LanguageProvider><FeedbackProvider><WebBrandHead /><AppContent /></FeedbackProvider></LanguageProvider></ThemeProvider></SafeAreaProvider>; }
