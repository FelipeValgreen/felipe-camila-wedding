import test from 'node:test';
import assert from 'node:assert/strict';

import { readRSVP, validateRSVPInput } from '../api/_lib/rsvp-service.js';
import { isValidUUID } from '../api/_lib/supabase-admin.js';

test('G1. readRSVP rejects invalid UUIDs', async () => {
    const res = await readRSVP('invalid_uuid', 'some_token');
    assert.equal(res.ok, false);
    assert.equal(res.status, 401);
    assert.equal(res.error, 'INVALID_CREDENTIALS');
});

test('G2. readRSVP rejects missing token or id', async () => {
    const res = await readRSVP('', '');
    assert.equal(res.ok, false);
    assert.equal(res.status, 401);
    assert.equal(res.error, 'INVALID_CREDENTIALS');
});

test('G3. isValidUUID returns true for valid v4 UUID and false for invalid', () => {
    assert.equal(isValidUUID('123e4567-e89b-12d3-a456-426614174000'), true);
    assert.equal(isValidUUID('not-a-uuid'), false);
    assert.equal(isValidUUID(null), false);
});
