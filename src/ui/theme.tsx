import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

const light = {
  bg: '#F8F9F5', surface: '#FFFFFF', ink: '#202C27', muted: '#737E72', line: '#E2E7DD',
  green: '#254E3D', mint: '#E9F0E2', accent: '#D5E2CB', orange: '#F3EBDD', red: '#A34F43',
  nav: '#F1F4ED', subtle: '#F1F2F0', field: '#FBFCFA', placeholder: '#748073',
  onGreen: '#FFFFFF', success: '#254E3D', warningText: '#936C31', dangerSurface: '#FFF4F2',
} as const;

const dark: { [K in keyof typeof light]: string } = {
  bg: '#101713', surface: '#1A251F', ink: '#F0F5ED', muted: '#AFBFAF', line: '#344238',
  green: '#A9D7AD', mint: '#293D30', accent: '#496650', orange: '#463A23', red: '#F2A89D',
  nav: '#152019', subtle: '#27322B', field: '#202D25', placeholder: '#9EAF9E',
  onGreen: '#14251A', success: '#B7E6B9', warningText: '#F1D090', dangerSurface: '#402824',
};

export type ThemeColors = { [K in keyof typeof light]: string };
type ThemeValue = { colors: ThemeColors; scheme: 'light' | 'dark'; preference: ThemePreference; setPreference: (value: ThemePreference) => void };
const Context = createContext<ThemeValue | null>(null);
const storageKey = 'tempo:appearance:v1';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(storageKey).then(value => {
      if (value === 'light' || value === 'dark' || value === 'system') setPreferenceState(value);
    }).catch(() => {}).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (ready) void AsyncStorage.setItem(storageKey, preference).catch(() => {}); }, [preference, ready]);
  const scheme = preference === 'system' ? system === 'dark' ? 'dark' : 'light' : preference;
  const value = useMemo<ThemeValue>(() => ({ colors: scheme === 'dark' ? dark : light, scheme, preference, setPreference: setPreferenceState }), [scheme, preference]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(Context);
  if (!value) throw new Error('ThemeProvider is missing');
  return value;
}
