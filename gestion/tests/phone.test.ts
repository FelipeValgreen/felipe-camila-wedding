import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateAndNormalizePhone } from '../lib/phone';

test('accepts an empty phone as optional', () => {
  assert.deepEqual(validateAndNormalizePhone(''), { valid: true, normalized: null });
  assert.deepEqual(validateAndNormalizePhone(null), { valid: true, normalized: null });
});

test('normalizes Chilean mobile numbers to E.164', () => {
  assert.deepEqual(validateAndNormalizePhone('+56 9 1234 5678'), { valid: true, normalized: '+56912345678' });
  assert.deepEqual(validateAndNormalizePhone('56912345678'), { valid: true, normalized: '+56912345678' });
  assert.deepEqual(validateAndNormalizePhone('912345678'), { valid: true, normalized: '+56912345678' });
});

test('accepts generic international E.164 numbers', () => {
  assert.deepEqual(validateAndNormalizePhone('+14155552671'), { valid: true, normalized: '+14155552671' });
});

test('rejects malformed phone numbers', () => {
  const result = validateAndNormalizePhone('12345');

  assert.equal(result.valid, false);
  assert.equal(result.normalized, null);
  assert.match(result.error || '', /inválido/i);
});
