import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseBooleanFlag,
  resolveGestionRuntimeEnvironment,
  shouldBlockDatabaseWrite,
  shouldBlockExternalSync,
  shouldBlockNonProductionApiWrite,
} from '../lib/environment-policy';

test('environment: resolves Vercel environments before NODE_ENV', () => {
  assert.equal(resolveGestionRuntimeEnvironment('production', 'development'), 'production');
  assert.equal(resolveGestionRuntimeEnvironment('preview', 'production'), 'preview');
  assert.equal(resolveGestionRuntimeEnvironment(undefined, 'test'), 'development');
  assert.equal(resolveGestionRuntimeEnvironment(undefined, 'production'), 'unknown');
});

test('environment: parses explicit opt-in values consistently', () => {
  for (const value of ['1', 'true', 'TRUE', ' yes ', 'on']) {
    assert.equal(parseBooleanFlag(value), true, value);
  }
  for (const value of [undefined, null, '', '0', 'false', 'off', 'random']) {
    assert.equal(parseBooleanFlag(value), false, String(value));
  }
});

test('environment: production API writes are allowed', () => {
  assert.equal(shouldBlockNonProductionApiWrite({
    pathname: '/api/tables',
    method: 'POST',
    environment: 'production',
  }), false);
});

test('environment: safe API methods and non-API requests are never blocked by write guard', () => {
  assert.equal(shouldBlockNonProductionApiWrite({
    pathname: '/api/tables',
    method: 'GET',
    environment: 'preview',
  }), false);
  assert.equal(shouldBlockNonProductionApiWrite({
    pathname: '/dashboard',
    method: 'POST',
    environment: 'preview',
  }), false);
});

test('environment: preview mutations are blocked unless explicitly enabled', () => {
  assert.equal(shouldBlockNonProductionApiWrite({
    pathname: '/api/tables',
    method: 'PATCH',
    environment: 'preview',
  }), true);
  assert.equal(shouldBlockNonProductionApiWrite({
    pathname: '/api/tables',
    method: 'PATCH',
    environment: 'preview',
    allowNonProductionWrites: 'yes',
  }), false);
});

test('environment: database writes stay blocked in unknown environments by default', () => {
  assert.equal(shouldBlockDatabaseWrite({ environment: 'unknown' }), true);
  assert.equal(shouldBlockDatabaseWrite({
    environment: 'development',
    allowNonProductionWrites: 'true',
  }), false);
});

test('environment: external sync requires both write and sync opt-ins outside production', () => {
  assert.equal(shouldBlockExternalSync({
    environment: 'preview',
    allowNonProductionWrites: 'false',
    allowNonProductionExternalSync: 'true',
  }), true);
  assert.equal(shouldBlockExternalSync({
    environment: 'preview',
    allowNonProductionWrites: 'true',
    allowNonProductionExternalSync: 'false',
  }), true);
  assert.equal(shouldBlockExternalSync({
    environment: 'preview',
    allowNonProductionWrites: 'on',
    allowNonProductionExternalSync: '1',
  }), false);
  assert.equal(shouldBlockExternalSync({ environment: 'production' }), false);
});
