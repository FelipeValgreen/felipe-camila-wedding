import test from 'node:test';
import assert from 'node:assert/strict';

import { syncToGoogleSheets, getGoogleAccessToken } from '../api/_lib/google-sheets.js';

test('S1. syncToGoogleSheets rejects missing access_token from OAuth mock', async () => {
    const mockFetch = async (url) => {
        if (url.includes('oauth2.googleapis.com')) {
            return {
                ok: true,
                json: async () => ({}) // missing access_token
            };
        }
        return { ok: false };
    };

    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test_sheet';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@account.com';
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = 'LINE1\nLINE2';

    const res = await syncToGoogleSheets({ attendance_status: 'attending', source: 'web' }, false, {
        fetchImpl: mockFetch,
        signImpl: () => 'mock_jwt_signature'
    });

    assert.equal(res.synced, false);
    assert.equal(res.error, 'GOOGLE_ACCESS_TOKEN_MISSING');

    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
});

test('S2. syncToGoogleSheets handles full mocked OAuth + Append sequence using injected fetchImpl and signImpl', async () => {
    let appendCalled = false;
    let customSignerCalled = false;

    const mockFetch = async (url) => {
        if (url.includes('oauth2.googleapis.com')) {
            return {
                ok: true,
                json: async () => ({ access_token: 'fake_oauth_token_123' })
            };
        }

        if (url.includes(':append')) {
            appendCalled = true;
            return {
                ok: true,
                json: async () => ({
                    updates: { updatedRange: 'CONFIRMACIONES_RSVP_TEST!A15:M15' }
                })
            };
        }

        return { ok: false, status: 404 };
    };

    const mockSigner = (signInput, key) => {
        customSignerCalled = true;
        assert.equal(key, 'LINE1\nLINE2');
        return 'injected_test_signature';
    };

    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test_sheet';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@account.com';
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = 'LINE1\nLINE2';

    const res = await syncToGoogleSheets(
        { id: '123e4567-e89b-12d3-a456-426614174000', first_name: 'Camila', last_name: 'Pérez', attendance_status: 'attending', source: 'web' },
        false,
        { fetchImpl: mockFetch, signImpl: mockSigner }
    );

    assert.equal(res.synced, true);
    assert.equal(res.sheet_row_number, 15);
    assert.equal(appendCalled, true);
    assert.equal(customSignerCalled, true);

    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
});

test('S3. syncToGoogleSheets updates exact matched row with injected dependencies', async () => {
    let putCalled = false;

    const mockFetch = async (url, opts) => {
        if (url.includes('oauth2.googleapis.com')) {
            return { ok: true, json: async () => ({ access_token: 'token_123' }) };
        }

        if (opts && opts.method === 'PUT') {
            putCalled = true;
            return { ok: true, json: async () => ({}) };
        }

        return {
            ok: true,
            json: async () => ({ values: [['123e4567-e89b-12d3-a456-426614174000']] })
        };
    };

    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test_sheet';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@account.com';
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = 'LINE1\nLINE2';

    const res = await syncToGoogleSheets(
        { id: '123e4567-e89b-12d3-a456-426614174000', sheet_row_number: 12, attendance_status: 'attending', source: 'web' },
        true,
        { fetchImpl: mockFetch, signImpl: () => 'sig' }
    );

    assert.equal(res.synced, true);
    assert.equal(res.sheet_row_number, 12);
    assert.equal(putCalled, true);

    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
});

test('S4. syncToGoogleSheets recovers from stale row number via UUID search', async () => {
    let putCalledOnRow18 = false;

    const mockFetch = async (url, opts) => {
        if (url.includes('oauth2.googleapis.com')) {
            return { ok: true, json: async () => ({ access_token: 'token_123' }) };
        }

        if (opts && opts.method === 'PUT' && url.includes('!A18:M18')) {
            putCalledOnRow18 = true;
            return { ok: true, json: async () => ({}) };
        }

        if (url.includes('!A10')) {
            return { ok: true, json: async () => ({ values: [['different_uuid_999']] }) };
        }

        return {
            ok: true,
            json: async () => ({
                values: Array(17).fill(['other_uuid']).concat([['target_uuid_456']])
            })
        };
    };

    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test_sheet';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@account.com';
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = 'LINE1\nLINE2';

    const res = await syncToGoogleSheets(
        { id: 'target_uuid_456', sheet_row_number: 10, attendance_status: 'attending', source: 'web' },
        true,
        { fetchImpl: mockFetch, signImpl: () => 'sig' }
    );

    assert.equal(res.synced, true);
    assert.equal(res.sheet_row_number, 18);
    assert.equal(putCalledOnRow18, true);

    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
});

test('S5. syncToGoogleSheets search failure prevents append', async () => {
    const mockFetch = async (url) => {
        if (url.includes('oauth2.googleapis.com')) {
            return { ok: true, json: async () => ({ access_token: 'token_123' }) };
        }
        if (url.includes('!A:A')) {
            return { ok: false, status: 500 };
        }
        return { ok: false };
    };

    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test_sheet';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@account.com';
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = 'LINE1\nLINE2';

    const res = await syncToGoogleSheets(
        { id: 'target_uuid_456', attendance_status: 'attending', source: 'web' },
        true,
        { fetchImpl: mockFetch, signImpl: () => 'sig' }
    );

    assert.equal(res.synced, false);
    assert.equal(res.error, 'SHEETS_SEARCH_FAILED');

    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
});
