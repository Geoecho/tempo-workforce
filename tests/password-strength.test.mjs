import assert from 'node:assert/strict';
import test from 'node:test';
import { passwordStrength } from '../src/lib/password-strength.ts';

test('empty and short passwords never appear secure', () => {
  assert.equal(passwordStrength('').score, 0);
  assert.equal(passwordStrength('A1!b').score, 1);
  assert.match(passwordStrength('A1!b').hint, /4 more/);
});
test('common and repeated passwords stay weak even when long', () => {
  for (const value of ['Password123456789!', 'aaaaaaaaaaaaaaaaaaaa', '12345678901234567890']) assert.equal(passwordStrength(value).score, 1);
});
test('long passphrases and mixed passwords receive useful feedback', () => {
  assert.equal(passwordStrength('river lantern meadow').score, 4);
  assert.equal(passwordStrength('R!verMoon4729').score, 4);
  assert.equal(passwordStrength('riverbed').score, 2);
});
