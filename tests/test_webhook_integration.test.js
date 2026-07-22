import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { Readable } from 'stream';

import webhookHandler from '../api/whatsapp/webhook.js';

function createMockReqRes({ method = 'POST', headers = {}, body = {} } = {}) {
    let statusCode = 200;
    let jsonBody = null;
    let textBody = null;

    const rawBuf = Buffer.from(JSON.stringify(body));
    const metaSecret = 'test_secret_123';
    process.env.META_APP_SECRET = metaSecret;
    const sig = 'sha256=' + crypto.createHmac('sha256', metaSecret).update(rawBuf).digest('hex');

    const req = Readable.from([rawBuf]);
    req.method = method;
    req.headers = { 'content-type': 'application/json', 'x-hub-signature-256': sig, ...headers };
    req.body = body;
    req.rawBody = rawBuf;

    const res = {
        status: (code) => {
            statusCode = code;
            return res;
        },
        json: (data) => {
            jsonBody = data;
            return res;
        },
        send: (data) => {
            textBody = data;
            return res;
        },
        getStatusCode: () => statusCode,
        getJsonBody: () => jsonBody
    };

    return { req, res };
}

test('W1. Webhook successful delivery returns HTTP 200', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url, opts) => {
        if (opts && opts.method === 'POST' && url.includes('whatsapp_processed_messages')) {
            return { ok: true, json: async () => [{ message_id: 'msg_w1', status: 'processing' }], text: async () => '' };
        }
        if (url.includes('whatsapp_sessions')) {
            return { ok: true, json: async () => [{ state: 'IDLE' }], text: async () => '' };
        }
        if (url.includes('graph.facebook.com')) {
            return { ok: true, json: async () => ({ messages: [{ id: 'wamid.123' }] }) };
        }
        if (opts && opts.method === 'PATCH') {
            return { ok: true, json: async () => [], text: async () => '' };
        }
        return { ok: true, json: async () => [], text: async () => '' };
    };

    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    process.env.WHATSAPP_ACCESS_TOKEN = 'fake_token';

    const { req, res } = createMockReqRes({
        body: {
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    value: {
                        messages: [{ id: 'msg_w1', from: '56912345678', text: { body: 'hola' } }]
                    }
                }]
            }]
        }
    });

    await webhookHandler(req, res);
    assert.equal(res.getStatusCode(), 200);
    assert.equal(res.getJsonBody().status, 'EVENT_RECEIVED');

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.META_APP_SECRET;
    global.fetch = originalFetch;
});

test('W2. Webhook processing failure returns HTTP 500 with WEBHOOK_PROCESSING_FAILED', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url, opts) => {
        if (opts && opts.method === 'POST' && url.includes('whatsapp_processed_messages')) {
            return { ok: true, json: async () => [{ message_id: 'msg_w2', status: 'processing' }], text: async () => '' };
        }
        if (url.includes('whatsapp_sessions')) {
            return { ok: true, json: async () => [{ state: 'IDLE' }], text: async () => '' };
        }
        if (url.includes('graph.facebook.com')) {
            return { ok: false, status: 500 }; // Send fails
        }
        if (opts && opts.method === 'PATCH') {
            return { ok: true, json: async () => [], text: async () => '' };
        }
        return { ok: true, json: async () => [], text: async () => '' };
    };

    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    process.env.WHATSAPP_ACCESS_TOKEN = 'fake_token';

    const { req, res } = createMockReqRes({
        body: {
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    value: {
                        messages: [{ id: 'msg_w2', from: '56912345678', text: { body: 'hola' } }]
                    }
                }]
            }]
        }
    });

    await webhookHandler(req, res);
    assert.equal(res.getStatusCode(), 500);
    assert.equal(res.getJsonBody().error, 'WEBHOOK_PROCESSING_FAILED');

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.META_APP_SECRET;
    global.fetch = originalFetch;
});

test('W3. Processed duplicate message is ignored with HTTP 200', async () => {
    const originalFetch = global.fetch;
    let flowExecuted = false;

    global.fetch = async (url, opts) => {
        if (opts && opts.method === 'POST' && url.includes('whatsapp_processed_messages')) {
            return { ok: false, status: 409, text: async () => 'duplicate key' };
        }
        if (opts && opts.method === 'GET' && url.includes('whatsapp_processed_messages')) {
            return { ok: true, json: async () => [{ message_id: 'msg_dup', status: 'processed' }], text: async () => '' };
        }
        flowExecuted = true;
        return { ok: true, json: async () => [], text: async () => '' };
    };

    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';

    const { req, res } = createMockReqRes({
        body: {
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    value: {
                        messages: [{ id: 'msg_dup', from: '56912345678', text: { body: 'hola' } }]
                    }
                }]
            }]
        }
    });

    await webhookHandler(req, res);
    assert.equal(res.getStatusCode(), 200);
    assert.equal(flowExecuted, false);

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.META_APP_SECRET;
    global.fetch = originalFetch;
});

test('W4. Webhook idempotency & ACK_SENT retry behavior', async () => {
    const originalFetch = global.fetch;
    let rsvpWriteCount = 0;
    let sendAckCount = 0;
    let sessionStatesSaved = [];

    global.fetch = async (url, opts) => {
        if (opts && opts.method === 'POST' && url.includes('whatsapp_processed_messages')) {
            return { ok: true, json: async () => [{ message_id: 'msg_ack_test', status: 'processing' }], text: async () => '' };
        }

        if (url.includes('whatsapp_sessions')) {
            if (opts && opts.method === 'POST') {
                const body = JSON.parse(opts.body);
                sessionStatesSaved.push(body.state);
            }
            return { ok: true, json: async () => [{ state: 'COMPLETED_PENDING_ACK', session_data: { rsvp_id: 'rsvp_99', ack_sent: true } }], text: async () => '' };
        }

        if (url.includes('graph.facebook.com')) {
            sendAckCount++;
            return { ok: true, json: async () => ({ messages: [{ id: 'wamid.999' }] }) };
        }

        if (url.includes('rsvp_responses')) {
            rsvpWriteCount++;
            return { ok: true, json: async () => [{ id: 'rsvp_99' }], text: async () => '' };
        }

        return { ok: true, json: async () => [], text: async () => '' };
    };

    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    process.env.WHATSAPP_ACCESS_TOKEN = 'fake_token';

    const { req, res } = createMockReqRes({
        body: {
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    value: {
                        messages: [{ id: 'msg_ack_test', from: '56912345678', text: { body: 'confirmar' } }]
                    }
                }]
            }]
        }
    });

    await webhookHandler(req, res);
    assert.equal(res.getStatusCode(), 200);
    assert.equal(rsvpWriteCount, 0); // No RSVP write when ack_sent=true
    assert.equal(sendAckCount, 0); // No duplicated ack send when ack_sent=true
    assert.equal(sessionStatesSaved.includes('IDLE'), true); // Session normalized to IDLE

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.META_APP_SECRET;
    global.fetch = originalFetch;
});
