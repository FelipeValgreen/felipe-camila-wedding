import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeName, normalizePhone, validateRSVPInput, generateManageToken, hashToken } from '../api/_lib/rsvp-service.js';
import { mapRSVPStatusToSheet, syncToGoogleSheets } from '../api/_lib/google-sheets.js';
import publicConfigHandler from '../api/public-config.js';

test('normalizeName cleans accents, casing and spaces', () => {
    assert.equal(normalizeName('  CAMILA   Pérez  '), 'camila perez');
    assert.equal(normalizeName('Felipe   Valenzuela '), 'felipe valenzuela');
});

test('normalizePhone enforces 8-15 digits and single leading plus', () => {
    assert.equal(normalizePhone('+56 9 8139 3436'), '+56981393436');
    assert.equal(normalizePhone('56981393436'), '56981393436');
    assert.equal(normalizePhone('++56981393436'), null);
    assert.equal(normalizePhone('56+981393436'), null);
    assert.equal(normalizePhone('phone123'), null);
    assert.equal(normalizePhone('1234'), null);
});

test('validateRSVPInput validates attendance and dietary rules', () => {
    const v1 = validateRSVPInput({ first_name: 'Camila', last_name: 'Pérez', phone: '+56981393436', attendance_status: 'attending', dietary_type: 'Vegano' });
    assert.equal(v1.valid, true);

    const v2 = validateRSVPInput({ first_name: 'Camila', last_name: 'Pérez', phone: '+56981393436', attendance_status: 'not_attending' });
    assert.equal(v2.valid, true);
    assert.equal(v2.data.dietary_type, null);

    const v3 = validateRSVPInput({ first_name: 'Camila', last_name: 'Pérez', phone: '+56981393436', attendance_status: 'pending' });
    assert.equal(v3.valid, true);

    const v4 = validateRSVPInput({ first_name: 'Camila', last_name: 'Pérez', phone: '+56981393436', attendance_status: 'attending', dietary_type: 'Alergias', dietary_detail: '' });
    assert.equal(v4.valid, false);
});

test('generateManageToken produces distinct tokens and valid sha256 hashes', () => {
    const t1 = generateManageToken();
    const t2 = generateManageToken();
    assert.notEqual(t1, t2);
    assert.equal(hashToken(t1).length, 64);
});

test('mapRSVPStatusToSheet correctly maps values', () => {
    assert.equal(mapRSVPStatusToSheet('attending', 'web'), 'Confirmado Web');
    assert.equal(mapRSVPStatusToSheet('attending', 'whatsapp'), 'Confirmado WhatsApp');
    assert.equal(mapRSVPStatusToSheet('not_attending', 'web'), 'No Asiste');
    assert.equal(mapRSVPStatusToSheet('pending', 'web'), 'Pendiente');
});

test('syncToGoogleSheets returns SHEETS_NOT_CONFIGURED when environment variables absent', async () => {
    const res = await syncToGoogleSheets({ attendance_status: 'attending', source: 'web' }, false);
    assert.equal(res.synced, false);
    assert.equal(res.error, 'SHEETS_NOT_CONFIGURED');
});

test('publicConfigHandler returns configured number or null', () => {
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
