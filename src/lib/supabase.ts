import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const recoveryRedirect = Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';

// Optional Tempo API gateway (gateway/). When set, data API calls (/rest/v1) go
// through it so the JWT is verified and rate limits apply before Supabase.
// Auth and Realtime always talk to Supabase directly. Unset = direct, as before.
const gateway = process.env.EXPO_PUBLIC_API_GATEWAY_URL?.replace(/\/+$/, '');
const gatewayAllowed = !!gateway && (/^https:\/\//.test(gateway) || /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(gateway));
if (gateway && !gatewayAllowed) console.warn('EXPO_PUBLIC_API_GATEWAY_URL must use https. Calling Supabase directly.');
const restBase = url ? new URL('rest/v1/', url.endsWith('/') ? url : `${url}/`).href : '';
const gatewayFetch: typeof fetch = (input, init) => {
  const target = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!target.startsWith(restBase)) return fetch(input, init);
  const routed = `${gateway}/rest/v1/${target.slice(restBase.length)}`;
  return typeof input === 'string' || input instanceof URL ? fetch(routed, init) : fetch(new Request(routed, input), init);
};

export const supabase = url && key
  ? createClient(url, key, {
      ...(gatewayAllowed ? { global: { fetch: gatewayFetch } } : {}),
      auth: {
        ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

// Short-lived client for native OAuth. PKCE binds the returned code to a
// verifier held only in this instance's memory, so a deep link fired by another
// app cannot sign the user into a different account. Email links keep the
// default flow, which works when they are opened on another device.
export const createPkceClient = () => url && key
  ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'tempo-oauth-pkce' } })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', status => {
    if (status === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
