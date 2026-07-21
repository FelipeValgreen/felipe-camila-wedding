// Automated Test Suite for RSVP Unified V2 System
// File: test/rsvp.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/rsvp.js';

function createMockReqRes({ method = 'GET', query = {}, body = {}, headers = {} }) {
    const req = { method, query, body, headers };
    const res = {
        statusCode: 200,
        headers: {},
        jsonData: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.jsonData = data;
            return this;
        }
    };
    return { req, res };
}

test('1. Reject GET with invalid parameters', async () => {
    const { req, res } = createMockReqRes({ method: 'GET', query: {} });
    await handler(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.error, 'INVALID_PARAMETERS');
});

test('2. Token lookup returns 501 NOT_IMPLEMENTED when backend is unpersisted', async () => {
    const { req, res } = createMockReqRes({ method: 'GET', query: { i: 'valid_token' } });
    await handler(req, res);
    assert.equal(res.statusCode, 501);
    assert.equal(res.jsonData.error, 'NOT_IMPLEMENTED');
});

test('3. POST without idempotency-key header is rejected', async () => {
    const { req, res } = createMockReqRes({
        method: 'POST',
        headers: { 'x-invitation-session': 'session_123' },
        body: { guest_id: 'abc', attendance: 'yes' }
    });
    await handler(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.error, 'MISSING_IDEMPOTENCY_KEY');
});

test('4. POST without invitation session is rejected (Security check)', async () => {
    const { req, res } = createMockReqRes({
        method: 'POST',
        headers: { 'idempotency-key': 'key_123' },
        body: { guest_id: 'abc', attendance: 'yes' }
    });
    await handler(req, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.jsonData.error, 'UNAUTHORIZED_SESSION');
});

test('5. POST with valid headers returns 501 until DB transaction is active', async () => {
    const { req, res } = createMockReqRes({
        method: 'POST',
        headers: {
            'idempotency-key': 'stable_key_001',
            'x-invitation-session': 'valid_session_abc'
        },
        body: {
            guest_id: '11111111-2222-3333-4444-555555555555',
            attendance: 'yes',
            dietary_type: 'Ninguna'
        }
    });
    await handler(req, res);
    assert.equal(res.statusCode, 501);
    assert.equal(res.jsonData.error, 'NOT_IMPLEMENTED');
});

test('6. Unsupported HTTP method returns 405', async () => {
    const { req, res } = createMockReqRes({ method: 'DELETE' });
    await handler(req, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.jsonData.error, 'METHOD_NOT_ALLOWED');
});
