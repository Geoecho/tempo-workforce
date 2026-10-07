// Every RPC the Tempo client calls. Anything else under /rest/v1 is refused, which
// hides the rest of the schema (including the OpenAPI description at /rest/v1/).
export const DEFAULT_RPCS = [
  'tempo_snapshot', 'tempo_break_snapshot', 'tempo_messages_snapshot',
  'tempo_accept_invite', 'tempo_create_workspace', 'tempo_save_snapshot',
  'tempo_issue_qr', 'tempo_record_punch', 'tempo_record_break', 'tempo_review_time',
  'tempo_mark_notification_read', 'tempo_send_message', 'tempo_mark_message_read',
  'tempo_sync_versions', 'tempo_meta_snapshot',
  'tempo_task_list', 'tempo_task_list_compact', 'tempo_task_change', 'tempo_task_proof',
  'tempo_request_list', 'tempo_request_submit', 'tempo_request_review',
  'tempo_register_push', 'tempo_unregister_push',
];
export const DEFAULT_TABLES = ['tempo_invites'];

const list = value => (value ?? '').split(',').map(item => item.trim()).filter(Boolean);

function int(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
}

export function loadConfig(env = process.env) {
  const rawUrl = env.SUPABASE_URL;
  if (!rawUrl) throw new Error('SUPABASE_URL is required');
  const supabaseUrl = new URL(rawUrl);
  if (!['https:', 'http:'].includes(supabaseUrl.protocol)) throw new Error('SUPABASE_URL must be http(s)');
  if (supabaseUrl.protocol === 'http:' && env.ALLOW_INSECURE_UPSTREAM !== 'true') {
    throw new Error('SUPABASE_URL must use https (set ALLOW_INSECURE_UPSTREAM=true only for local Supabase)');
  }
  const base = supabaseUrl.origin;
  return {
    port: int(env, 'PORT', 8080),
    supabaseUrl: base,
    jwksUrl: env.SUPABASE_JWKS_URL || `${base}/auth/v1/.well-known/jwks.json`,
    // Only for projects still on the legacy shared JWT secret (HS256).
    jwtSecret: env.SUPABASE_JWT_SECRET || null,
    jwtIssuer: env.JWT_ISSUER || `${base}/auth/v1`,
    jwtAudience: env.JWT_AUDIENCE || 'authenticated',
    allowedOrigins: new Set(list(env.ALLOWED_ORIGINS)),
    rpcs: new Set(env.ALLOWED_RPCS ? list(env.ALLOWED_RPCS) : DEFAULT_RPCS),
    tables: new Set(env.ALLOWED_TABLES ? list(env.ALLOWED_TABLES) : DEFAULT_TABLES),
    // Workspace snapshots may reach 20 MB in the database; leave room for JSON overhead.
    maxBodyBytes: int(env, 'MAX_BODY_BYTES', 22 * 1024 * 1024),
    rateWindowSeconds: int(env, 'RATE_LIMIT_WINDOW_SECONDS', 60),
    ipLimit: int(env, 'RATE_LIMIT_PER_IP', 1200),
    userLimit: int(env, 'RATE_LIMIT_PER_USER', 600),
    redisUrl: env.REDIS_URL || null,
    redisPrefix: env.REDIS_PREFIX || 'tempo-gw:',
    // Number of trusted proxies in front of the gateway (the ingress controller).
    trustProxyHops: int(env, 'TRUST_PROXY_HOPS', 1),
    upstreamTimeoutMs: int(env, 'UPSTREAM_TIMEOUT_MS', 30000),
  };
}
