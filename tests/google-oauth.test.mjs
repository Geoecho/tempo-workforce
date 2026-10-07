import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/lib/oauth.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness(path, exchangeError = null) {
  const calls = { exchange: [], sessions: [], redirects: [], removed: [] };
  const location = new URL(path, 'https://tempo.example');
  const window = {
    location,
    sessionStorage: { removeItem: key => calls.removed.push(key) },
    history: { replaceState: (_state, _title, path) => { location.href = new URL(path, location).href; } },
  };
  const session = { access_token: 'test-access', refresh_token: 'test-refresh' };
  const pkce = { auth: {
    exchangeCodeForSession: async code => {
      calls.exchange.push(code);
      return { data: { session: exchangeError ? null : session }, error: exchangeError };
    },
    signInWithOAuth: async options => { calls.redirects.push(options); return { error: null }; },
  } };
  const client = { auth: { setSession: async value => { calls.sessions.push(value); return { error: null }; } } };
  const dependencies = {
    '@react-native-async-storage/async-storage': { setItem: async () => {}, removeItem: async () => {} },
    '@supabase/supabase-js': { createClient: () => pkce },
    'expo-linking': {},
    'react-native': { Platform: { OS: 'web' } },
    './supabase': {},
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: name => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    window, URL, URLSearchParams,
    process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-key' } },
  });
  return { oauth: exports, client, calls, location };
}

for (const route of ['/', '/start']) {
  test(`Google callback completes at ${route} and removes the single-use code`, async () => {
    const { oauth, client, calls, location } = harness(`${route}?code=test-code&lang=en`);
    assert.equal(await oauth.finishWebOAuth(client), true);
    assert.deepEqual(calls.exchange, ['test-code']);
    assert.equal(calls.sessions[0].access_token, 'test-access');
    assert.equal(location.searchParams.has('code'), false);
    assert.equal(location.searchParams.get('lang'), 'en');
    assert.equal(await oauth.finishWebOAuth(client), false);
    assert.equal(calls.exchange.length, 1);
  });
}

test('new web sign-in returns to the initiating origin and sign-in route', async () => {
  const { oauth, client, calls } = harness('/start');
  await oauth.signInWithGoogle(client);
  assert.equal(calls.redirects[0].provider, 'google');
  assert.equal(calls.redirects[0].options.redirectTo, 'https://tempo.example/start');
});

test('cancellation clears callback details and never installs a session', async () => {
  const { oauth, client, calls, location } = harness('/?error=access_denied&error_description=private-detail');
  await assert.rejects(oauth.finishWebOAuth(client), /cancelled/);
  assert.equal(calls.exchange.length, 0);
  assert.equal(calls.sessions.length, 0);
  assert.equal(location.search, '');
});

test('failed PKCE exchange never installs a session or exposes server errors', async () => {
  const { oauth, client, calls, location } = harness('/?code=expired', new Error('private server detail'));
  await assert.rejects(oauth.finishWebOAuth(client), /Please try again/);
  assert.equal(calls.sessions.length, 0);
  assert.equal(location.search, '');
});

test('implicit URL tokens are not accepted as Google sessions', async () => {
  const { oauth, client, calls } = harness('/#access_token=untrusted&refresh_token=untrusted');
  assert.equal(await oauth.finishWebOAuth(client), false);
  assert.equal(calls.exchange.length, 0);
  assert.equal(calls.sessions.length, 0);
});
