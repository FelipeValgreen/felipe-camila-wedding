import test from 'node:test';
import assert from 'node:assert/strict';

import { validateAndNormalizePhone } from '../lib/phone';

test('phone: empty values remain optional', () => {
  assert.deepEqual(validateAndNormalizePhone(null), { valid: true, normalized: null });
  assert.deepEqual(validateAndNormalizePhone('   '), { valid: true, normalized: null });
});

test('phone: normalizes common Chilean mobile formats', () => {
  assert.deepEqual(validateAndNormalizePhone('+56 9 1234 5678'), {
    valid: true,
    normalized: '+56912345678',
  });
  assert.deepEqual(validateAndNormalizePhone('56912345678'), {
    valid: true,
    normalized: '+56912345678',
  });
  assert.deepEqual(validateAndNormalizePhone('912345678'), {
    valid: true,
    normalized: '+56912345678',
  });
});

test('phone: accepts international E.164-like values within supported length', () => {
  assert.deepEqual(validateAndNormalizePhone('+14155552671'), {
    valid: true,
    normalized: '+14155552671',
  });
});

test('phone: rejects malformed values instead of guessing', () => {
  const result = validateAndNormalizePhone('1234-abc');
  assert.equal(result.valid, false);
  assert.equal(result.normalized, null);
  assert.match(result.error || '', /inválido/i);
});
