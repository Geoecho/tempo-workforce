import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { DEFAULT_RPCS, loadConfig } from '../src/config.js';
import { createVerifier } from '../src/jwt.js';
import { createMemoryStore, createRateLimiter } from '../src/rate-limit.js';
import { clientIp, createGateway } from '../src/server.js';

const SECRET = 'legacy-test-secret-at-least-32-characters!';
const srcRoot = fileURLToPath(new URL('../../src/', import.meta.url));
function clientRpcs(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const target = join(path, entry.name);
    if (entry.isDirectory()) return clientRpcs(target);
    if (!/\.tsx?$/.test(entry.name)) return [];
    return [...readFileSync(target, 'utf8').matchAll(/\.rpc\(['"](tempo_[a-z_]+)['"]/g)].map(match => match[1]);
  });
}

test('gateway permits every RPC used by the client', () => {
  const missing = [...new Set(clientRpcs(srcRoot))].filter(name => !DEFAULT_RPCS.includes(name));
  assert.deepEqual(missing, []);
});
let upstream, gateway, base, upstreamUrl, keys, otherKeys, upstreamCalls = 0;

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));

async function token({ key = keys.privateKey, alg = 'ES256', sub = 'user-1', role = 'authenticated', aud = 'authenticated', iss = `${upstreamUrl}/auth/v1`, exp = '1h' } = {}) {
  return new SignJWT({ role }).setProtectedHeader({ alg, kid: alg === 'HS256' ? undefined : 'test' })
    .setSubject(sub).setAudience(aud).setIssuer(iss).setIssuedAt().setExpirationTime(exp).sign(key);
}

function makeGateway(overrides = {}) {
  const config = { ...loadConfig({ SUPABASE_URL: upstreamUrl, ALLOW_INSECURE_UPSTREAM: 'true', ALLOWED_ORIGINS: 'https://app.example.com', TRUST_PROXY_HOPS: '0', SUPABASE_JWT_SECRET: SECRET }), ...overrides };
  const limiter = createRateLimiter(createMemoryStore(), config.rateWindowSeconds);
  return createGateway(config, { verify: createVerifier(config), limiter, log: () => {} });
}

before(async () => {
  keys = await generateKeyPair('ES256');
  otherKeys = await generateKeyPair('ES256');
  const jwk = { ...(await exportJWK(keys.publicKey)), kid: 'test', alg: 'ES256', use: 'sig' };
  upstream = http.createServer((req, res) => {
    if (req.url === '/auth/v1/.well-known/jwks.json') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ keys: [jwk] })); return; }
    upstreamCalls++;
    let size = 0;
    req.on('data', chunk => { size += chunk.length; });
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify({ method: req.method, url: req.url, size, auth: !!req.headers.authorization, apikey: req.headers.apikey ?? null, xff: req.headers['x-forwarded-for'] }));
    });
  });
  upstreamUrl = await listen(upstream);
  gateway = makeGateway();
  base = await listen(gateway);
});
after(() => { gateway.close(); upstream.close(); });

const rpc = async (name, init = {}) => fetch(`${base}/rest/v1/rpc/${name}`, { method: 'POST', headers: { 'content-type': 'application/json', ...init.headers }, body: init.body ?? '{}', ...init.extra });

test('health endpoints respond without auth', async () => {
  assert.equal((await fetch(`${base}/healthz`)).status, 200);
  assert.equal((await fetch(`${base}/readyz`)).status, 200);
});

test('valid ES256 token is proxied with body, apikey and security headers', async () => {
  const res = await rpc('tempo_send_message', { headers: { authorization: `Bearer ${await token()}`, apikey: 'sb_publishable_x' }, body: JSON.stringify({ p_to: 'all', p_body: 'hi' }) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual([body.method, body.url, body.auth, body.apikey], ['POST', '/rest/v1/rpc/tempo_send_message', true, 'sb_publishable_x']);
  assert.ok(body.size > 0);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.ok(res.headers.get('x-request-id'));
});

test('legacy HS256 token works when the secret is configured', async () => {
  const res = await rpc('tempo_snapshot', { headers: { authorization: `Bearer ${await token({ key: new TextEncoder().encode(SECRET), alg: 'HS256' })}` } });
  assert.equal(res.status, 200);
});

test('missing, forged, expired, wrong-audience, wrong-issuer, anon and alg:none tokens are refused', async () => {
  const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'x', role: 'authenticated', aud: 'authenticated', exp: 9999999999 })).toString('base64url')}.`;
  const bad = [
    undefined,
    'Bearer not-a-jwt',
    `Bearer ${await token({ key: otherKeys.privateKey })}`,
    `Bearer ${await token({ exp: Math.floor(Date.now() / 1000) - 120 })}`,
    `Bearer ${await token({ aud: 'other' })}`,
    `Bearer ${await token({ iss: 'https://evil.example.com/auth/v1' })}`,
    `Bearer ${await token({ role: 'anon' })}`,
    `Bearer ${none}`,
    `Bearer ${await token({ key: new TextEncoder().encode('wrong-secret-wrong-secret-wrong-secret'), alg: 'HS256' })}`,
  ];
  const before = upstreamCalls;
  for (const authorization of bad) {
    const res = await rpc('tempo_snapshot', { headers: authorization ? { authorization } : {} });
    assert.equal(res.status, 401, `expected 401 for ${authorization}`);
    const body = await res.json();
    assert.equal(body.code, 'GW401');
    assert.ok(body.message);
  }
  assert.equal(upstreamCalls, before, 'refused requests must not reach Supabase');
});

test('only allowlisted RPCs, tables and methods are reachable', async () => {
  const authorization = `Bearer ${await token()}`;
  assert.equal((await rpc('pg_sleep', { headers: { authorization } })).status, 404);
  assert.equal((await fetch(`${base}/rest/v1/`, { headers: { authorization } })).status, 404);
  assert.equal((await fetch(`${base}/rest/v1/tempo_workspaces`, { headers: { authorization } })).status, 404);
  assert.equal((await fetch(`${base}/auth/v1/token`, { method: 'POST' })).status, 404);
  assert.equal((await fetch(`${base}/rest/v1/rpc/tempo_snapshot`, { method: 'PUT', headers: { authorization } })).status, 405);
  const invite = await fetch(`${base}/rest/v1/tempo_invites?on_conflict=workspace_id,email`, { method: 'POST', headers: { authorization, prefer: 'resolution=merge-duplicates' }, body: '{}' });
  assert.equal(invite.status, 200);
  assert.equal((await invite.json()).url, '/rest/v1/tempo_invites?on_conflict=workspace_id,email');
});

test('CORS: allowed origin gets its own headers, upstream wildcard is stripped, others are refused', async () => {
  const preflight = await fetch(`${base}/rest/v1/rpc/tempo_snapshot`, { method: 'OPTIONS', headers: { origin: 'https://app.example.com', 'access-control-request-method': 'POST' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://app.example.com');
  assert.match(preflight.headers.get('access-control-allow-headers'), /apikey/);
  const res = await rpc('tempo_snapshot', { headers: { origin: 'https://app.example.com', authorization: `Bearer ${await token()}` } });
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://app.example.com');
  assert.equal((await rpc('tempo_snapshot', { headers: { origin: 'https://evil.example.com', authorization: `Bearer ${await token()}` } })).status, 403);
});

test('per-user and per-IP limits return 429 with Retry-After', async () => {
  const limited = makeGateway({ userLimit: 3, ipLimit: 0 });
  const url = await listen(limited);
  const authorization = `Bearer ${await token({ sub: 'busy-user' })}`;
  const call = () => fetch(`${url}/rest/v1/rpc/tempo_snapshot`, { method: 'POST', headers: { authorization }, body: '{}' });
  for (let i = 0; i < 3; i++) assert.equal((await call()).status, 200);
  const res = await call();
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get('retry-after')) >= 1);
  assert.match((await res.json()).message, /Too many requests/);
  limited.close();

  const ipLimited = makeGateway({ ipLimit: 2 });
  const ipUrl = await listen(ipLimited);
  const anon = () => fetch(`${ipUrl}/rest/v1/rpc/tempo_snapshot`, { method: 'POST', body: '{}' });
  assert.equal((await anon()).status, 401);
  assert.equal((await anon()).status, 401);
  assert.equal((await anon()).status, 429, 'unauthenticated floods are limited per IP before JWT work');
  ipLimited.close();
});

test('oversized bodies are refused with 413 (declared and streamed)', async () => {
  const small = makeGateway({ maxBodyBytes: 1024 });
  const url = await listen(small);
  const authorization = `Bearer ${await token()}`;
  const declared = await fetch(`${url}/rest/v1/rpc/tempo_save_snapshot`, { method: 'POST', headers: { authorization }, body: 'x'.repeat(2048) });
  assert.equal(declared.status, 413);
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < 8; i++) controller.enqueue(new TextEncoder().encode('y'.repeat(512))); controller.close(); } });
  const streamed = await fetch(`${url}/rest/v1/rpc/tempo_save_snapshot`, { method: 'POST', headers: { authorization }, body: stream, duplex: 'half' });
  assert.equal(streamed.status, 413);
  small.close();
});

test('unreachable upstream returns 502 in PostgREST error shape', async () => {
  const dead = makeGateway({ supabaseUrl: 'http://127.0.0.1:1' });
  const url = await listen(dead);
  const res = await fetch(`${url}/rest/v1/rpc/tempo_snapshot`, { method: 'POST', headers: { authorization: `Bearer ${await token()}` }, body: '{}' });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).code, 'GW502');
  dead.close();
});

test('client IP uses the trusted proxy hop, not spoofable left-most entries', () => {
  const req = { socket: { remoteAddress: '10.0.0.5' }, headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' } };
  assert.equal(clientIp(req, 1), '203.0.113.9');
  assert.equal(clientIp(req, 0), '10.0.0.5');
  assert.equal(clientIp({ socket: { remoteAddress: '10.0.0.5' }, headers: {} }, 1), '10.0.0.5');
});

test('config refuses insecure or missing upstream', () => {
  assert.throws(() => loadConfig({}), /SUPABASE_URL is required/);
  assert.throws(() => loadConfig({ SUPABASE_URL: 'http://example.com' }), /https/);
  assert.throws(() => loadConfig({ SUPABASE_URL: 'https://x.supabase.co', RATE_LIMIT_PER_USER: '-1' }), /non-negative/);
  assert.equal(loadConfig({ SUPABASE_URL: 'https://x.supabase.co/' }).jwtIssuer, 'https://x.supabase.co/auth/v1');
});
