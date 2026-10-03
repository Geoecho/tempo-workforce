import type { SupabaseClient } from '@supabase/supabase-js';

// Authenticator-app (TOTP) two-factor sign-in through Supabase Auth. Optional per
// account; once on, the database refuses every request from a session that has
// not completed the second step (see 20261003_security_hardening.sql).

export async function mfaChallengeNeeded(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
}

export async function verifiedTotpFactorId(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error || !data) return null;
  return data.all.find(factor => factor.factor_type === 'totp' && factor.status === 'verified')?.id ?? null;
}

export async function verifyTotpCode(client: SupabaseClient, factorId: string, code: string): Promise<void> {
  const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') });
  if (error) throw error;
}

export async function startTotpEnrollment(client: SupabaseClient): Promise<{ factorId: string; uri: string; secret: string }> {
  // Remove abandoned, never-verified enrolments so a new one can be created.
  const { data: factors } = await client.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type === 'totp' && factor.status !== 'verified') await client.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', issuer: 'Tempo' });
  if (error) throw error;
  return { factorId: data.id, uri: data.totp.uri, secret: data.totp.secret };
}

export async function removeTotpFactor(client: SupabaseClient, factorId: string): Promise<void> {
  const { error } = await client.auth.mfa.unenroll({ factorId });
  if (error) throw error;
  // Drop back to a fresh token so the session matches the account's new state.
  await client.auth.refreshSession();
}
