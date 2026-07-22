import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import { normalizeName, normalizePhone, validateRSVPInput, generateManageToken, hashToken, timingSafeTokenEqual } from '../api/_lib/rsvp-service.js';
import { mapRSVPStatusToSheet, syncToGoogleSheets } from '../api/_lib/google-sheets.js';
import publicConfigHandler from '../api/public-config.js';
import rsvpHandler from '../api/rsvp.js';
import webhookHandler from '../api/whatsapp/webhook.js';
import { sendWhatsAppMessage } from '../api/_lib/whatsapp-client.js';

// Group A: RSVP Validation & Normalization
test('A1. normalizeName cleans accents, casing and spaces', () => {
    assert.equal(normalizeName('  CAMILA   Pérez  '), 'camila perez');
    assert.equal(normalizeName('Felipe   Valenzuela '), 'felipe valenzuela');
});

test('A2. normalizePhone enforces 8-15 digits and always prepends + (canonical)', () => {
    assert.equal(normalizePhone('+56 9 1234 5678'), '+56912345678');
    assert.equal(normalizePhone('56912345678'), '+56912345678');
    assert.equal(normalizePhone('912345678'), '+56912345678');
    assert.equal(normalizePhone('++56912345678'), null);
    assert.equal(normalizePhone('56+912345678'), null);
    assert.equal(normalizePhone('phone123'), null);
    assert.equal(normalizePhone('1234'), null);
});

test('A3. validateRSVPInput validates valid attending and dietary', () => {
    const v = validateRSVPInput({ first_name: 'Camila', last_name: 'Pérez', phone: '+56912345678', attendance_status: 'attending', dietary_type: 'Vegano' });
    assert.equal(v.valid, true);
    assert.equal(v.data.full_name_normalized, 'camila perez');
    assert.equal(v.data.phone_e164, '+56912345678');
});

test('A4. validateRSVPInput handles not_attending without dietary', () => {
    const v = validateRSVPInput({ first_name: 'Camila', last_name: 'Pérez', phone: '56912345678', attendance_status: 'not_attending' });
    assert.equal(v.valid, true);
    assert.equal(v.data.phone_e164, '+56912345678');
    assert.equal(v.data.dietary_type, null);
});

test('A5. validateRSVPInput handles pending status', () => {
    const v = validateRSVPInput({ first_name: 'Camila', last_name: 'Pérez', phone: '912345678', attendance_status: 'pending' });
    assert.equal(v.valid, true);
    assert.equal(v.data.phone_e164, '+56912345678');
});

test('A6. validateRSVPInput rejects invalid short names', () => {
    const v = validateRSVPInput({ first_name: 'C', last_name: 'P', phone: '+56912345678', attendance_status: 'attending' });
    assert.equal(v.valid, false);
});

test('A7. validateRSVPInput requires detail for Alergias', () => {
    const v = validateRSVPInput({ first_name: 'Camila', last_name: 'Pérez', phone: '+56912345678', attendance_status: 'attending', dietary_type: 'Alergias', dietary_detail: '' });
    assert.equal(v.valid, false);
});

test('A8. validateRSVPInput requires detail for Otra', () => {
    const v = validateRSVPInput({ first_name: 'Camila', last_name: 'Pérez', phone: '+56912345678', attendance_status: 'attending', dietary_type: 'Otra', dietary_detail: 'Sin sal' });
    assert.equal(v.valid, true);
    assert.equal(v.data.dietary_detail, 'Sin sal');
});

test('A9. validateRSVPInput supports Celíaco / libre de gluten option', () => {
    const v = validateRSVPInput({ first_name: 'Camila', last_name: 'Pérez', phone: '+56912345678', attendance_status: 'attending', dietary_type: 'Celíaco / libre de gluten' });
    assert.equal(v.valid, true);
});

test('A10. validateRSVPInput supports Vegetariano option', () => {
    const v = validateRSVPInput({ first_name: 'Camila', last_name: 'Pérez', phone: '+56912345678', attendance_status: 'attending', dietary_type: 'Vegetariano' });
    assert.equal(v.valid, true);
});

test('A11. validateRSVPInput supports Ninguna option', () => {
    const v = validateRSVPInput({ first_name: 'Camila', last_name: 'Pérez', phone: '+56912345678', attendance_status: 'attending', dietary_type: 'Ninguna' });
    assert.equal(v.valid, true);
});

// Group B: Timing-safe token management & UUID validation
test('B1. timingSafeTokenEqual verifies valid token and rejects invalid', () => {
    const token = generateManageToken();
    const hash = hashToken(token);
    assert.equal(timingSafeTokenEqual(token, hash), true);
    assert.equal(timingSafeTokenEqual('wrong_token', hash), false);
    assert.equal(timingSafeTokenEqual(null, hash), false);
});

test('B2. timingSafeTokenEqual handles malformed tokens safely', () => {
    assert.equal(timingSafeTokenEqual('', ''), false);
    assert.equal(timingSafeTokenEqual(123, 'hash'), false);
});

// Group C: Google Sheets Mapping & Private Key newline conversion
test('C1. mapRSVPStatusToSheet correctly maps values', () => {
    assert.equal(mapRSVPStatusToSheet('attending', 'web'), 'Confirmado Web');
    assert.equal(mapRSVPStatusToSheet('attending', 'whatsapp'), 'Confirmado WhatsApp');
    assert.equal(mapRSVPStatusToSheet('not_attending', 'web'), 'No Asiste');
    assert.equal(mapRSVPStatusToSheet('pending', 'web'), 'Pendiente');
});

test('C2. syncToGoogleSheets returns SHEETS_NOT_CONFIGURED when environment variables absent', async () => {
    const res = await syncToGoogleSheets({ attendance_status: 'attending', source: 'web' }, false);
    assert.equal(res.synced, false);
    assert.equal(res.error, 'SHEETS_NOT_CONFIGURED');
});

test('C3. syncToGoogleSheets attempts auth with formatted private key containing literal \\n', async () => {
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test_sheet';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@account.com';
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nFAKE_KEY\n-----END PRIVATE KEY-----';

    const res = await syncToGoogleSheets({ attendance_status: 'attending', source: 'web' }, false);
    assert.equal(res.synced, false);
    assert.equal(res.error.includes('GOOGLE_AUTH_FAILED') || res.error.includes('error'), true);

    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
});

// Group D: Web API Endpoint
test('D1. /api/rsvp returns 503 when Supabase server env absent', async () => {
    const req = { method: 'POST', headers: { 'content-type': 'application/json' }, body: { action: 'create' } };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
        setHeader: () => {},
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonBody = data; return res; }
    };

    await rsvpHandler(req, res);
    assert.equal(statusCode, 503);
    assert.equal(jsonBody.error, 'RSVP_NOT_CONFIGURED');
});

test('D2. /api/rsvp rejects non-POST method', async () => {
    const req = { method: 'GET', headers: {} };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
        setHeader: () => {},
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonBody = data; return res; }
    };

    await rsvpHandler(req, res);
    assert.equal(statusCode, 405);
});

test('D3. /api/rsvp rejects missing application/json content-type', async () => {
    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';

    const req = { method: 'POST', headers: { 'content-type': 'text/plain' }, body: {} };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
        setHeader: () => {},
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonBody = data; return res; }
    };

    await rsvpHandler(req, res);
    assert.equal(statusCode, 400);
    assert.equal(jsonBody.error, 'INVALID_CONTENT_TYPE');

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('D4. /api/rsvp rejects oversized payload (>8KB)', async () => {
    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';

    const req = { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '9000' }, body: {} };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
        setHeader: () => {},
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonBody = data; return res; }
    };

    await rsvpHandler(req, res);
    assert.equal(statusCode, 413);
    assert.equal(jsonBody.error, 'PAYLOAD_TOO_LARGE');

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('D5. /api/rsvp rejects honeypot field', async () => {
    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';

    const req = { method: 'POST', headers: { 'content-type': 'application/json' }, body: { website: 'spam_bot' } };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
        setHeader: () => {},
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonBody = data; return res; }
    };

    await rsvpHandler(req, res);
    assert.equal(statusCode, 400);
    assert.equal(jsonBody.error, 'INVALID_REQUEST');

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('D6. /api/rsvp accepts SUPABASE_URL + SUPABASE_SECRET_KEY without RSVP_NOT_CONFIGURED', async () => {
    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_TEST_ONLY_NOT_REAL';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const req = { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '9000' }, body: {} };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
        setHeader: () => {},
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonBody = data; return res; }
    };

    await rsvpHandler(req, res);
    assert.equal(statusCode, 413);
    assert.equal(jsonBody.error, 'PAYLOAD_TOO_LARGE');

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
});

test('D7. /api/rsvp accepts SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY without RSVP_NOT_CONFIGURED', async () => {
    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy.jwt.test-only';
    delete process.env.SUPABASE_SECRET_KEY;

    const req = { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '9000' }, body: {} };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
        setHeader: () => {},
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonBody = data; return res; }
    };

    await rsvpHandler(req, res);
    assert.equal(statusCode, 413);
    assert.equal(jsonBody.error, 'PAYLOAD_TOO_LARGE');

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});


// Group E: Public Config Endpoint
test('E1. publicConfigHandler returns configured number or null', () => {
    const req = { method: 'GET' };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
        setHeader: () => {},
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonBody = data; return res; }
    };

    publicConfigHandler(req, res);
    assert.equal(statusCode, 200);
    assert.equal(Object.prototype.hasOwnProperty.call(jsonBody, 'wedding_whatsapp_number'), true);
});

test('E2. publicConfigHandler exposes WEDDING_WHATSAPP_NUMBER when set', () => {
    process.env.WEDDING_WHATSAPP_NUMBER = '56912345678';
    const req = { method: 'GET' };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
        setHeader: () => {},
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonBody = data; return res; }
    };

    publicConfigHandler(req, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonBody.wedding_whatsapp_number, '56912345678');
    delete process.env.WEDDING_WHATSAPP_NUMBER;
});

// Group F: WhatsApp Webhook Signature & Client Errors
test('F1. webhook GET returns 500 when WHATSAPP_VERIFY_TOKEN is absent', async () => {
    const req = { method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'test' } };
    let statusCode = 0;
    let sentText = null;
    const res = {
        status: (code) => { statusCode = code; return res; },
        send: (txt) => { sentText = txt; return res; }
    };

    await webhookHandler(req, res);
    assert.equal(statusCode, 500);
    assert.equal(sentText, 'VERIFY_TOKEN_NOT_CONFIGURED');
});

test('F2. webhook GET returns challenge when verify token matches', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'valid_verify_token';
    const req = { method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'valid_verify_token', 'hub.challenge': '12345' } };
    let statusCode = 0;
    let sentText = null;
    const res = {
        status: (code) => { statusCode = code; return res; },
        send: (txt) => { sentText = txt; return res; }
    };

    await webhookHandler(req, res);
    assert.equal(statusCode, 200);
    assert.equal(sentText, '12345');
    delete process.env.WHATSAPP_VERIFY_TOKEN;
});

test('F3. webhook POST rejects unsigned request when META_APP_SECRET is set', async () => {
    process.env.META_APP_SECRET = 'test_secret';
    const req = { method: 'POST', headers: {}, body: Buffer.from('{}') };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonBody = data; return res; }
    };

    await webhookHandler(req, res);
    assert.equal(statusCode, 401);
    assert.equal(jsonBody.error, 'UNAUTHORIZED_WEBHOOK');
    delete process.env.META_APP_SECRET;
});

test('F4. webhook POST accepts valid HMAC signature over raw Buffer', async () => {
    const secret = 'test_meta_secret_123';
    process.env.META_APP_SECRET = secret;

    const rawBuffer = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', entry: [] }));
    const expectedSig = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBuffer).digest('hex');

    const req = {
        method: 'POST',
        headers: { 'x-hub-signature-256': expectedSig },
        body: rawBuffer
    };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonBody = data; return res; }
    };

    await webhookHandler(req, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonBody.status, 'EVENT_RECEIVED');

    delete process.env.META_APP_SECRET;
});

test('F5. webhook POST rejects malformed JSON', async () => {
    const secret = 'test_meta_secret_123';
    process.env.META_APP_SECRET = secret;

    const rawBuffer = Buffer.from('invalid_json_{{');
    const expectedSig = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBuffer).digest('hex');

    const req = {
        method: 'POST',
        headers: { 'x-hub-signature-256': expectedSig },
        body: rawBuffer
    };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonBody = data; return res; }
    };

    await webhookHandler(req, res);
    assert.equal(statusCode, 400);
    assert.equal(jsonBody.error, 'MALFORMED_JSON');

    delete process.env.META_APP_SECRET;
});

test('F6. sendWhatsAppMessage returns WHATSAPP_NOT_CONFIGURED when environment variables absent', async () => {
    const res = await sendWhatsAppMessage('+56912345678', 'Hello');
    assert.equal(res.ok, false);
    assert.equal(res.error, 'WHATSAPP_NOT_CONFIGURED');
});
