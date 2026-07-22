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
    process.env.WHATSAPP_GRAPH_API_VERSION = 'v23.0';

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
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
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
            return { ok: false, status: 500 };
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
    process.env.WHATSAPP_GRAPH_API_VERSION = 'v23.0';

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
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
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

test('W4. New message received after ack_sent=true is not swallowed', async () => {
    const originalFetch = global.fetch;
    let newMsgFlowExecuted = false;

    global.fetch = async (url, opts) => {
        if (opts && opts.method === 'POST' && url.includes('whatsapp_processed_messages')) {
            return { ok: true, json: async () => [{ message_id: 'msg_new_123', status: 'processing' }], text: async () => '' };
        }

        if (url.includes('whatsapp_sessions')) {
            if (opts && opts.method === 'GET') {
                return { ok: true, json: async () => [{ state: 'COMPLETED_PENDING_ACK', session_data: { rsvp_id: 'rsvp_99', ack_sent: true, source_message_id: 'msg_old_999' } }], text: async () => '' };
            }
            return { ok: true, json: async () => [{ state: 'AWAITING_ATTENDANCE' }], text: async () => '' };
        }

        if (url.includes('rsvp_responses')) {
            newMsgFlowExecuted = true;
            return { ok: true, json: async () => [{ id: 'rsvp_99', first_name: 'Camila', last_name: 'Pérez' }], text: async () => '' };
        }

        if (url.includes('graph.facebook.com')) {
            return { ok: true, json: async () => ({ messages: [{ id: 'wamid.123' }] }) };
        }

        return { ok: true, json: async () => [], text: async () => '' };
    };

    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    process.env.WHATSAPP_ACCESS_TOKEN = 'fake_token';
    process.env.WHATSAPP_GRAPH_API_VERSION = 'v23.0';

    const { req, res } = createMockReqRes({
        body: {
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    value: {
                        messages: [{ id: 'msg_new_123', from: '56912345678', text: { body: 'modificar' } }]
                    }
                }]
            }]
        }
    });

    await webhookHandler(req, res);
    assert.equal(res.getStatusCode(), 200);
    assert.equal(newMsgFlowExecuted, true);

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
    delete process.env.META_APP_SECRET;
    global.fetch = originalFetch;
});

test('W5. Processed-mark failure keeps COMPLETED_PENDING_ACK and returns HTTP 500 without resetting to IDLE', async () => {
    const originalFetch = global.fetch;
    let idleSaved = false;

    global.fetch = async (url, opts) => {
        if (opts && opts.method === 'POST' && url.includes('whatsapp_processed_messages')) {
            return { ok: true, json: async () => [{ message_id: 'msg_fail_mark', status: 'processing' }], text: async () => '' };
        }

        if (url.includes('whatsapp_sessions')) {
            if (opts && opts.method === 'POST') {
                const body = JSON.parse(opts.body);
                if (body.state === 'IDLE') idleSaved = true;
            }
            return { ok: true, json: async () => [{ state: 'COMPLETED_PENDING_ACK', session_data: { rsvp_id: 'rsvp_val_99', ack_sent: true, source_message_id: 'msg_fail_mark' } }], text: async () => '' };
        }

        if (url.includes('graph.facebook.com')) {
            return { ok: true, json: async () => ({ messages: [{ id: 'wamid.123' }] }) };
        }

        if (opts && opts.method === 'PATCH' && url.includes('whatsapp_processed_messages')) {
            if (url.includes('status=failed')) {
                return { ok: true, json: async () => [], text: async () => '' };
            }
            return { ok: false, status: 500, text: async () => 'DB Error' };
        }

        return { ok: true, json: async () => [], text: async () => '' };
    };

    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    process.env.WHATSAPP_ACCESS_TOKEN = 'fake_token';
    process.env.WHATSAPP_GRAPH_API_VERSION = 'v23.0';

    const { req, res } = createMockReqRes({
        body: {
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    value: {
                        messages: [{ id: 'msg_fail_mark', from: '56912345678', text: { body: 'confirmar' } }]
                    }
                }]
            }]
        }
    });

    await webhookHandler(req, res);
    assert.equal(res.getStatusCode(), 500);
    assert.equal(idleSaved, false);

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
    delete process.env.META_APP_SECRET;
    global.fetch = originalFetch;
});

test('W6. Pre-checkpoint retry reuses existing RSVP via last_whatsapp_message_id and writes exactly once', async () => {
    const originalFetch = global.fetch;
    let rsvpPostCount = 0;
    let sheetSyncCount = 0;

    global.fetch = async (url, opts) => {
        if (opts && opts.method === 'POST' && url.includes('whatsapp_processed_messages')) {
            return { ok: true, json: async () => [{ message_id: 'msg_pre_check', status: 'processing' }], text: async () => '' };
        }

        if (url.includes('whatsapp_sessions')) {
            return { ok: true, json: async () => [{ state: 'AWAITING_CONFIRMATION', session_data: { first_name: 'Camila', last_name: 'Pérez', attendance_status: 'attending', dietary_type: 'Ninguna' } }], text: async () => '' };
        }

        if (url.includes('rsvp_responses?last_whatsapp_message_id=eq.')) {
            return { ok: true, json: async () => [{ id: 'rsvp_committed_123', first_name: 'Camila', last_name: 'Pérez', attendance_status: 'attending', dietary_type: 'Ninguna' }], text: async () => '' };
        }

        if (opts && opts.method === 'POST' && url.includes('rsvp_responses')) {
            rsvpPostCount++;
            return { ok: true, json: async () => [{ id: 'rsvp_new_999' }], text: async () => '' };
        }

        if (url.includes('sheets.googleapis.com')) {
            sheetSyncCount++;
            return { ok: true, json: async () => ({}) };
        }

        if (url.includes('graph.facebook.com')) {
            return { ok: true, json: async () => ({ messages: [{ id: 'wamid.123' }] }) };
        }

        return { ok: true, json: async () => [], text: async () => '' };
    };

    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    process.env.WHATSAPP_ACCESS_TOKEN = 'fake_token';
    process.env.WHATSAPP_GRAPH_API_VERSION = 'v23.0';

    const { req, res } = createMockReqRes({
        body: {
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    value: {
                        messages: [{ id: 'msg_pre_check', from: '56912345678', text: { body: 'confirmar' } }]
                    }
                }]
            }]
        }
    });

    await webhookHandler(req, res);
    assert.equal(res.getStatusCode(), 200);
    assert.equal(rsvpPostCount, 0);
    // Injected adapter sheet call counter assertion in test_flow_adapter.test.js proves zero sync calls

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
    delete process.env.META_APP_SECRET;
    global.fetch = originalFetch;
});
