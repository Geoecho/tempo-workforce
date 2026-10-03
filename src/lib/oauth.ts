import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Provider, SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { createPkceClient } from './supabase';

// OAuth sign-in through Supabase Auth. Off unless EXPO_PUBLIC_AUTH_PROVIDERS lists
// providers that are also enabled in the Supabase dashboard, e.g. "google,apple".
export type OAuthProvider = Extract<Provider, 'google' | 'apple' | 'azure' | 'github'>;
const SUPPORTED: OAuthProvider[] = ['google', 'apple', 'azure', 'github'];
const configuredProviders: string = process.env.EXPO_PUBLIC_AUTH_PROVIDERS ?? '';
export const oauthProviders: OAuthProvider[] = configuredProviders
  .split(',').map((item: string) => item.trim().toLowerCase()).filter((item: string): item is OAuthProvider => SUPPORTED.includes(item as OAuthProvider));
export const providerLabel: Record<OAuthProvider, string> = { google: 'Google', apple: 'Apple', azure: 'Microsoft', github: 'GitHub' };

// Password sign-up stores admin/worker intent in user metadata. OAuth cannot set
// metadata, so the intent is kept on the device until the first session loads.
const INTENT_KEY = 'tempo-oauth-intent';
type Intent = 'admin' | 'worker';

export async function signInWithOAuth(client: SupabaseClient, provider: OAuthProvider, intent?: Intent): Promise<void> {
  if (intent) await AsyncStorage.setItem(INTENT_KEY, intent).catch(() => {});
  if (Platform.OS === 'web') {
    const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/` } });
    if (error) throw error;
    return;
  }
  const redirectTo = Linking.createURL('/');
  const pkce = createPkceClient();
  if (!pkce) throw new Error('Online sign-in is not configured.');
  const { data, error } = await pkce.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
  if (error) throw error;
  // Loaded lazily so a native build without the module still starts.
  const WebBrowser = await import('expo-web-browser');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;
  const returned = new URL(result.url);
  const params = new URLSearchParams(returned.hash.slice(1));
  returned.searchParams.forEach((value, name) => params.set(name, value));
  const failure = params.get('error_description') ?? params.get('error');
  if (failure) throw new Error(failure);
  // Only a PKCE code is accepted; tokens placed directly in the URL are ignored.
  const code = params.get('code');
  if (!code) throw new Error('Sign-in was not completed.');
  const { data: exchanged, error: exchangeError } = await pkce.auth.exchangeCodeForSession(code);
  if (exchangeError || !exchanged.session) throw exchangeError ?? new Error('Sign-in was not completed.');
  const { error: sessionError } = await client.auth.setSession({ access_token: exchanged.session.access_token, refresh_token: exchanged.session.refresh_token });
  if (sessionError) throw sessionError;
}

// Returns the intent chosen before an OAuth redirect and saves it to the account,
// so later sign-ins on any device behave like a password account.
export async function consumeOAuthIntent(client: SupabaseClient): Promise<Intent | undefined> {
  const stored = await AsyncStorage.getItem(INTENT_KEY).catch(() => null);
  if (stored !== 'admin' && stored !== 'worker') return undefined;
  await AsyncStorage.removeItem(INTENT_KEY).catch(() => {});
  await client.auth.updateUser({ data: { tempo_intent: stored } }).catch(() => {});
  return stored;
}
