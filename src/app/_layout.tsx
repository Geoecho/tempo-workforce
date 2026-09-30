import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '../lib/store';

export default function Layout() { return <SafeAreaProvider><StoreProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#F7F7F5' } }}>
  <Stack.Screen name="index" options={{ animation: 'none' }} />
  <Stack.Screen name="schedule" options={{ animation: 'none' }} />
  <Stack.Screen name="team" options={{ animation: 'none' }} />
  <Stack.Screen name="scan" options={{ animation: 'none' }} />
  <Stack.Screen name="time" options={{ animation: 'none' }} />
  <Stack.Screen name="settings" options={{ animation: 'none' }} />
</Stack></StoreProvider></SafeAreaProvider>; }
