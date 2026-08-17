import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateDatabaseWritePolicy,
  evaluateExternalSyncPolicy,
  parseBooleanFlag,
  resolveGestionRuntimeEnvironment
} from '../lib/runtime-policy';

test('boolean flags accept the supported truthy spellings consistently', () => {
  for (const value of ['true', 'TRUE', '1', 'yes', 'YES', 'on', ' On ']) {
    assert.equal(parseBooleanFlag(value), true, value);
  }

  for (const value of [undefined, null, '', '0', 'false', 'off', 'no']) {
    assert.equal(parseBooleanFlag(value), false, String(value));
  }
});

test('production is detected and allows canonical writes', () => {
  const env = { VERCEL_ENV: 'production' };

  assert.equal(resolveGestionRuntimeEnvironment(env), 'production');
  assert.equal(evaluateDatabaseWritePolicy(env), null);
  assert.equal(evaluateExternalSyncPolicy(env), null);
});

test('preview blocks database writes by default', () => {
  const block = evaluateDatabaseWritePolicy({ VERCEL_ENV: 'preview' });

  assert.equal(block?.error, 'NON_PRODUCTION_WRITE_BLOCKED');
  assert.equal(block?.environment, 'preview');
});

test('preview may write only when explicitly enabled', () => {
  const env = { VERCEL_ENV: 'preview', ALLOW_NON_PRODUCTION_WRITES: 'true' };

  assert.equal(evaluateDatabaseWritePolicy(env), null);
  assert.equal(evaluateExternalSyncPolicy(env)?.error, 'NON_PRODUCTION_EXTERNAL_SYNC_BLOCKED');
});

test('external sync in staging requires its own explicit flag', () => {
  const env = {
    VERCEL_ENV: 'preview',
    ALLOW_NON_PRODUCTION_WRITES: 'YES',
    ALLOW_NON_PRODUCTION_EXTERNAL_SYNC: 'on'
  };

  assert.equal(evaluateDatabaseWritePolicy(env), null);
  assert.equal(evaluateExternalSyncPolicy(env), null);
});

test('NODE_ENV test and development are treated as development', () => {
  assert.equal(resolveGestionRuntimeEnvironment({ NODE_ENV: 'test' }), 'development');
  assert.equal(resolveGestionRuntimeEnvironment({ NODE_ENV: 'development' }), 'development');
});

test('unknown runtimes fail closed', () => {
  const block = evaluateDatabaseWritePolicy({ NODE_ENV: 'production' });

  assert.equal(resolveGestionRuntimeEnvironment({ NODE_ENV: 'production' }), 'unknown');
  assert.equal(block?.error, 'NON_PRODUCTION_WRITE_BLOCKED');
  assert.equal(block?.environment, 'unknown');
});
