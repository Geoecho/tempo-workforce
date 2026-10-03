import { randomUUID } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './config.js';
import { AuthError, createVerifier } from './jwt.js';
import { createMemoryStore, createRateLimiter, createRedisStore } from './rate-limit.js';

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host']);
const SECURITY_HEADERS = {
  'cache-control': 'no-store',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};
const CORS_ALLOW_HEADERS = 'authorization, apikey, content-type, prefer, range, accept-profile, content-profile, x-client-info, x-supabase-api-version, traceparent, tracestate, baggage';
const RPC_METHODS = new Set(['GET', 'HEAD', 'POST']);
const TABLE_METHODS = new Set(['GET', 'HEAD', 'POST', 'PATCH', 'DELETE']);

export function createLogger(write = line => process.stdout.write(line + '\n')) {
  return (level, msg, fields = {}) => write(JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields }));
}

// Client IP as seen by the outermost trusted proxy. X-Forwarded-For entries added
// before the trusted hops are client-controlled and ignored.
export function clientIp(req, trustProxyHops) {
  const socketIp = req.socket.remoteAddress ?? 'unknown';
  if (!trustProxyHops) return socketIp;
  const chain = String(req.headers['x-forwarded-for'] ?? '').split(',').map(item => item.trim()).filter(Boolean);
  return chain.length >= trustProxyHops ? chain[chain.length - trustProxyHops] : socketIp;
}

function route(pathname, config) {
  const rpc = pathname.match(/^\/rest\/v1\/rpc\/([A-Za-z0-9_]+)$/);
  if (rpc) return config.rpcs.has(rpc[1]) ? { kind: 'rpc', name: rpc[1], methods: RPC_METHODS } : null;
  const table = pathname.match(/^\/rest\/v1\/([A-Za-z0-9_]+)$/);
  if (table) return config.tables.has(table[1]) ? { kind: 'table', name: table[1], methods: TABLE_METHODS } : null;
  return null;
}

// Errors use PostgREST's shape so supabase-js surfaces `message` to the app unchanged.
function sendError(res, status, code, message, extraHeaders = {}) {
  if (res.headersSent) { res.destroy(); return; }
  const body = JSON.stringify({ code, message, details: null, hint: null });
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), ...extraHeaders });
  res.end(body);
}

export function createGateway(config, { verify, limiter, log }) {
  const upstream = new URL(config.supabaseUrl);
  const transport = upstream.protocol === 'https:' ? https : http;
  const agent = new transport.Agent({ keepAlive: true, maxSockets: 256 });

  function proxy(req, res, url, ip, done) {
    const headers = {};
    for (const [name, value] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP.has(name) && !name.startsWith('x-forwarded-')) headers[name] = value;
    }
    headers['x-forwarded-for'] = ip;
    headers['x-forwarded-proto'] = 'https';
    const upstreamReq = transport.request(new URL(url.pathname + url.search, upstream), { method: req.method, headers, agent, timeout: config.upstreamTimeoutMs }, upstreamRes => {
      const responseHeaders = {};
      for (const [name, value] of Object.entries(upstreamRes.headers)) {
        // Supabase sends "access-control-allow-origin: *"; the gateway sets its own CORS headers.
        if (!HOP_BY_HOP.has(name) && !name.startsWith('access-control-')) responseHeaders[name] = value;
      }
      res.writeHead(upstreamRes.statusCode ?? 502, responseHeaders);
      upstreamRes.pipe(res);
      upstreamRes.on('end', () => done(upstreamRes.statusCode));
    });
    upstreamReq.on('timeout', () => upstreamReq.destroy(Object.assign(new Error('Upstream timeout'), { code: 'ETIMEDOUT' })));
    let tooLarge = false;
    upstreamReq.on('error', error => {
      if (tooLarge) return;
      log('error', 'upstream request failed', { error: error.message });
      if (error.code === 'ETIMEDOUT') sendError(res, 504, 'GW504', 'The server took too long to respond. Please try again.');
      else sendError(res, 502, 'GW502', 'Could not reach the server. Please try again.');
      done(error.code === 'ETIMEDOUT' ? 504 : 502);
    });

    let received = 0;
    req.on('data', chunk => {
      received += chunk.length;
      if (received > config.maxBodyBytes && !tooLarge) {
        tooLarge = true;
        req.unpipe(upstreamReq);
        upstreamReq.destroy();
        sendError(res, 413, 'GW413', 'Request is too large.', { connection: 'close' });
        req.resume();
        done(413);
      }
    });
    req.pipe(upstreamReq);
  }

  async function handle(req, res) {
    const started = performance.now();
    const requestId = randomUUID();
    res.setHeader('x-request-id', requestId);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    const url = new URL(req.url ?? '/', 'http://gateway');
    let user;
    let logged = false;
    const finish = status => {
      if (logged) return;
      logged = true;
      log(status >= 500 ? 'error' : 'info', 'request', { requestId, method: req.method, path: url.pathname, status, user, ms: Math.round(performance.now() - started) });
    };

    if (url.pathname === '/healthz' || url.pathname === '/readyz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"status":"ok"}');
      return;
    }

    const origin = req.headers.origin;
    if (origin) {
      if (!config.allowedOrigins.has(origin)) { sendError(res, 403, 'GW403', 'Origin not allowed.'); return finish(403); }
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'Origin');
      res.setHeader('access-control-expose-headers', 'content-range, content-profile, x-request-id, retry-after');
    }
    if (req.method === 'OPTIONS') {
      if (!origin) { sendError(res, 404, 'GW404', 'Not found.'); return finish(404); }
      res.writeHead(204, {
        'access-control-allow-methods': 'GET, HEAD, POST, PATCH, DELETE, OPTIONS',
        'access-control-allow-headers': CORS_ALLOW_HEADERS,
        'access-control-max-age': '600',
      });
      res.end();
      return finish(204);
    }

    const target = route(url.pathname, config);
    if (!target) { sendError(res, 404, 'GW404', 'Not found.'); return finish(404); }
    if (!target.methods.has(req.method ?? '')) { sendError(res, 405, 'GW405', 'Method not allowed.', { allow: [...target.methods].join(', ') }); return finish(405); }

    const ip = clientIp(req, config.trustProxyHops);
    const ipHit = await limiter.hit(`ip:${ip}`, config.ipLimit);
    if (!ipHit.allowed) { sendError(res, 429, 'GW429', 'Too many requests. Please wait a moment and try again.', { 'retry-after': String(ipHit.retryAfter) }); return finish(429); }

    const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '')?.[1];
    if (!token) { sendError(res, 401, 'GW401', 'Sign in required.', { 'www-authenticate': 'Bearer' }); return finish(401); }
    try {
      user = (await verify(token)).sub;
    } catch (error) {
      const message = error instanceof AuthError ? error.message : 'Invalid token';
      sendError(res, 401, 'GW401', message === 'Token expired' ? 'Your session expired. Please sign in again.' : 'Sign in required.', { 'www-authenticate': 'Bearer error="invalid_token"' });
      return finish(401);
    }

    const userHit = await limiter.hit(`user:${user}`, config.userLimit);
    if (!userHit.allowed) { sendError(res, 429, 'GW429', 'Too many requests. Please wait a moment and try again.', { 'retry-after': String(userHit.retryAfter) }); return finish(429); }

    const declared = Number(req.headers['content-length'] ?? 0);
    if (declared > config.maxBodyBytes) { sendError(res, 413, 'GW413', 'Request is too large.', { connection: 'close' }); req.resume(); return finish(413); }

    proxy(req, res, url, ip, finish);
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch(error => {
      log('error', 'unhandled gateway error', { error: error.message });
      sendError(res, 500, 'GW500', 'Something went wrong. Please try again.');
    });
  });
  // Slow-client protection; keep-alive longer than the ingress' upstream keep-alive.
  server.requestTimeout = 60_000;
  server.headersTimeout = 20_000;
  server.keepAliveTimeout = 65_000;
  server.on('close', () => agent.destroy());
  return server;
}

async function main() {
  const log = createLogger();
  const config = loadConfig();
  const store = config.redisUrl ? await createRedisStore(config.redisUrl, config.redisPrefix) : createMemoryStore();
  if (!config.redisUrl) log('warn', 'REDIS_URL not set: rate limits are per replica');
  const limiter = createRateLimiter(store, config.rateWindowSeconds, log);
  const server = createGateway(config, { verify: createVerifier(config, log), limiter, log });
  server.listen(config.port, () => log('info', 'gateway listening', { port: config.port, upstream: config.supabaseUrl }));
  const shutdown = signal => {
    log('info', 'shutting down', { signal });
    server.close(() => { void limiter.close(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exit(1); });
}
