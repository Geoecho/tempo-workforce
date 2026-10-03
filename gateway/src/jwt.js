import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';

export class AuthError extends Error {}

// Verifies Supabase access tokens. Asymmetric keys (current Supabase default) are
// fetched from the project's JWKS and cached; HS256 is accepted only when the
// legacy shared secret is configured. The algorithm lists are disjoint, so a
// token cannot switch verification method (no alg confusion, no "none").
export function createVerifier({ jwksUrl, jwtSecret, jwtIssuer, jwtAudience }, log = () => {}) {
  const jwks = createRemoteJWKSet(new URL(jwksUrl), { cooldownDuration: 30_000, cacheMaxAge: 10 * 60_000, timeoutDuration: 5_000 });
  const secret = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;
  const options = { issuer: jwtIssuer, audience: jwtAudience, clockTolerance: 30, requiredClaims: ['sub', 'exp'] };

  return async function verify(token) {
    let header;
    try { header = decodeProtectedHeader(token); } catch { throw new AuthError('Malformed token'); }
    let payload;
    try {
      if (header.alg === 'HS256') {
        if (!secret) {
          log('error', 'HS256 token received but SUPABASE_JWT_SECRET is not set');
          throw new AuthError('Token signing method not accepted');
        }
        ({ payload } = await jwtVerify(token, secret, { ...options, algorithms: ['HS256'] }));
      } else {
        ({ payload } = await jwtVerify(token, jwks, { ...options, algorithms: ['ES256', 'RS256', 'EdDSA'] }));
      }
    } catch (error) {
      if (error instanceof AuthError) throw error;
      if (error?.code === 'ERR_JWKS_TIMEOUT' || error?.code === 'ERR_JOSE_GENERIC') log('error', 'JWKS unavailable', { error: error.message });
      throw new AuthError(error?.code === 'ERR_JWT_EXPIRED' ? 'Token expired' : 'Invalid token');
    }
    if (payload.role !== 'authenticated') throw new AuthError('Sign in required');
    return payload;
  };
}
