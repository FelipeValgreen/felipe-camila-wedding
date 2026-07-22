import test from 'node:test';
import assert from 'node:assert/strict';

import { sendWhatsAppMessage } from '../api/_lib/whatsapp-client.js';

test('V1. sendWhatsAppMessage uses configured WHATSAPP_GRAPH_API_VERSION in endpoint', async () => {
    let fetchUrlCalled = '';

    global.fetch = async (url) => {
        fetchUrlCalled = url;
        return { ok: true, json: async () => ({ messages: [{ id: 'wamid.v23' }] }) };
    };

    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone_123';
    process.env.WHATSAPP_ACCESS_TOKEN = 'token_123';
    process.env.WHATSAPP_GRAPH_API_VERSION = 'v23.0';

    const res = await sendWhatsAppMessage('+56912345678', 'Hola');
    assert.equal(res.ok, true);
    assert.equal(fetchUrlCalled, 'https://graph.facebook.com/v23.0/phone_123/messages');

    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
});

test('V2. sendWhatsAppMessage returns WHATSAPP_NOT_CONFIGURED if version missing or malformed', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone_123';
    process.env.WHATSAPP_ACCESS_TOKEN = 'token_123';

    delete process.env.WHATSAPP_GRAPH_API_VERSION;
    const resMissing = await sendWhatsAppMessage('+56912345678', 'Hola');
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.error, 'WHATSAPP_NOT_CONFIGURED');

    process.env.WHATSAPP_GRAPH_API_VERSION = '18.0'; // Missing 'v' prefix
    const resMalformed = await sendWhatsAppMessage('+56912345678', 'Hola');
    assert.equal(resMalformed.ok, false);
    assert.equal(resMalformed.error, 'WHATSAPP_NOT_CONFIGURED');

    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
});
