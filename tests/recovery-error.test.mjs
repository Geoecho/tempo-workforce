import assert from 'node:assert/strict';
import test from 'node:test';
import { recoveryError } from '../src/lib/recovery-error.ts';

test('distinguishes sender configuration from temporary rate limits', () => {
  const unauthorized = recoveryError({ code: 'email_address_not_authorized', status: 403 });
  assert.match(unauthorized.message, /not enabled for this address/);
  assert.equal(unauthorized.cooldown, 0);
  assert.equal(recoveryError({ code: 'over_email_send_rate_limit', status: 429 }).cooldown, 60);
  assert.equal(recoveryError({ status: 429 }).cooldown, 60);
});
test('delivery outages do not tell the user that retrying immediately will help', () => {
  assert.match(recoveryError({ code: 'unexpected_failure', status: 500 }).message, /service is unavailable/);
  assert.match(recoveryError({ code: 'email_provider_disabled' }).message, /not enabled/);
});
test('never exposes raw server details in user feedback', () => {
  const failure = recoveryError({ message: 'private@example.com password=secret', code: 'unknown_failure', status: 400 });
  assert.doesNotMatch(failure.message, /private|secret/);
});
