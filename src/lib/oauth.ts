import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { createPkceClient } from './supabase';

const WEB_PKCE_KEY = 'tempo-oauth-pkce-web';

function webPkceClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || typeof window === 'undefined') return null;
  return createClient(url, key, { auth: {
    flowType: 'pkce', storage: window.sessionStorage, storageKey: WEB_PKCE_KEY,
    persistSession: true, autoRefreshToken: false, detectSessionInUrl: false,
  } });
}

export async function finishWebOAuth(client: SupabaseClient): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const location = new URL(window.location.href);
  const code = location.searchParams.get('code');
  const failure = location.searchParams.get('error_description') ?? location.searchParams.get('error');
  if (!code && !failure) return false;
  location.searchParams.delete('code');
  location.searchParams.delete('error');
  location.searchParams.delete('error_description');
  window.history.replaceState(null, '', `${location.pathname}${location.search}${location.hash}`);
  if (failure) {
    throw new Error('Google sign-in was cancelled or could not be completed.');
  }
  const pkce = webPkceClient();
  if (!pkce) throw new Error('Online sign-in is not configured.');
  const { data, error } = await pkce.auth.exchangeCodeForSession(code!);
  if (error || !data.session) {
    throw new Error('Google sign-in could not be completed. Please try again.');
  }
  window.sessionStorage.removeItem(WEB_PKCE_KEY);
  const { error: sessionError } = await client.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  if (sessionError) {
    throw new Error('Google sign-in could not be completed. Please try again.');
  }
  return true;
}

export async function signInWithGoogle(client: SupabaseClient): Promise<void> {
  if (Platform.OS === 'web') {
    const pkce = webPkceClient();
    if (!pkce) throw new Error('Online sign-in is not configured.');
    const { error } = await pkce.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/start` } });
    if (error) throw error;
    return;
  }
  const redirectTo = Linking.createURL('/');
  const pkce = createPkceClient();
  if (!pkce) throw new Error('Online sign-in is not configured.');
  const { data, error } = await pkce.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
  if (error) throw error;
  const WebBrowser = await import('expo-web-browser');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;
  const returned = new URL(result.url);
  const params = new URLSearchParams(returned.hash.slice(1));
  returned.searchParams.forEach((value, name) => params.set(name, value));
  const failure = params.get('error_description') ?? params.get('error');
  if (failure) throw new Error('Google sign-in could not be completed.');
  // Only a PKCE code is accepted; tokens placed directly in the URL are ignored.
  const code = params.get('code');
  if (!code) throw new Error('Sign-in was not completed.');
  const { data: exchanged, error: exchangeError } = await pkce.auth.exchangeCodeForSession(code);
  if (exchangeError || !exchanged.session) throw exchangeError ?? new Error('Sign-in was not completed.');
  const { error: sessionError } = await client.auth.setSession({ access_token: exchanged.session.access_token, refresh_token: exchanged.session.refresh_token });
  if (sessionError) throw sessionError;
}
