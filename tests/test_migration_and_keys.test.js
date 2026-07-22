import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

import { formatPrivateKey, mapRSVPStatusToSheet } from '../api/_lib/google-sheets.js';

// Migration integrity test
test('M1. SQL migration uses valid $ tag and contains no numeric delimiters', () => {
    const sql = fs.readFileSync('supabase/migrations/20260721213300_unified_rsvp.sql', 'utf-8');
    assert.equal(sql.includes('RETURNS TRIGGER AS $'), true);
    assert.equal(sql.includes('$ LANGUAGE plpgsql;'), true);
    assert.equal(/RETURNS TRIGGER AS \d+/.test(sql), false);
    assert.equal(/\d+ LANGUAGE plpgsql;/.test(sql), false);
});

// Private key formatter tests
test('P1. formatPrivateKey converts literal \\n to real newlines', () => {
    const rawKey = 'LINE1\nLINE2\nLINE3';
    const formatted = formatPrivateKey(rawKey);
    assert.equal(formatted, 'LINE1\nLINE2\nLINE3');
});

test('P2. formatPrivateKey preserves existing real newlines', () => {
    const rawKey = 'LINE1\nLINE2\nLINE3';
    const formatted = formatPrivateKey(rawKey);
    assert.equal(formatted, 'LINE1\nLINE2\nLINE3');
});

test('P3. formatPrivateKey handles empty or null input', () => {
    assert.equal(formatPrivateKey(''), '');
    assert.equal(formatPrivateKey(null), '');
});
