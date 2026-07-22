import test from 'node:test';
import assert from 'node:assert/strict';

import { claimWhatsAppMessage, markWhatsAppMessageStatus } from '../api/_lib/supabase-admin.js';

test('H1. getRSVPsByPhoneSanitized requires SUPABASE_URL and returns failure without env', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await claimWhatsAppMessage('msg_1', '+56912345678').catch(err => ({ error: err.message }));
    assert.equal(res.error, 'SUPABASE_NOT_CONFIGURED');
});

test('H2. claimWhatsAppMessage requires SUPABASE_URL and throws without env', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await assert.rejects(async () => {
        await claimWhatsAppMessage('msg_123', '+56912345678');
    }, { message: 'SUPABASE_NOT_CONFIGURED' });
});

test('H3. markWhatsAppMessageStatus requires SUPABASE_URL and throws without env', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await assert.rejects(async () => {
        await markWhatsAppMessageStatus('msg_123', 'processed');
    }, { message: 'SUPABASE_NOT_CONFIGURED' });
});

test('H4. claimWhatsAppMessage handles failed conditional reclaim atomically', async () => {
    let patchUrlCalled = '';
    let patchPreferHeader = '';
    let patchBody = null;

    global.fetch = async (url, opts) => {
        if (opts.method === 'POST') {
            return { ok: false, status: 409, text: async () => 'duplicate key' };
        }
        if (opts.method === 'GET') {
            return { ok: true, json: async () => [{ message_id: 'msg_failed', status: 'failed', started_at: '2026-07-21T00:00:00Z' }] };
        }
        if (opts.method === 'PATCH') {
            patchUrlCalled = url;
            patchPreferHeader = opts.headers['Prefer'];
            patchBody = JSON.parse(opts.body);
            return { ok: true, json: async () => [{ message_id: 'msg_failed', status: 'processing' }] };
        }
        return { ok: false };
    };

    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';

    const res = await claimWhatsAppMessage('msg_failed', '+56912345678');
    assert.equal(res.claimed, true);
    assert.equal(res.retry, true);
    assert.equal(patchUrlCalled.includes('status=eq.failed'), true);
    assert.equal(patchPreferHeader, 'return=representation');
    assert.equal(patchBody.last_error_code, null);

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('H5. claimWhatsAppMessage handles stale processing reclaim using started_at CAS comparison', async () => {
    let patchUrlCalled = '';
    const staleTime = new Date(Date.now() - 40000).toISOString();

    global.fetch = async (url, opts) => {
        if (opts.method === 'POST') {
            return { ok: false, status: 409, text: async () => 'duplicate key' };
        }
        if (opts.method === 'GET') {
            return { ok: true, json: async () => [{ message_id: 'msg_stale', status: 'processing', started_at: staleTime }] };
        }
        if (opts.method === 'PATCH') {
            patchUrlCalled = url;
            return { ok: true, json: async () => [{ message_id: 'msg_stale', status: 'processing' }] };
        }
        return { ok: false };
    };

    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';

    const res = await claimWhatsAppMessage('msg_stale', '+56912345678');
    assert.equal(res.claimed, true);
    assert.equal(res.retry, true);
    assert.equal(patchUrlCalled.includes('status=eq.processing'), true);
    assert.equal(patchUrlCalled.includes('started_at=eq.' + encodeURIComponent(staleTime)), true);

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('H6. claimWhatsAppMessage concurrent stale reclaim returning 0 rows returns claimed=false', async () => {
    const staleTime = new Date(Date.now() - 40000).toISOString();

    global.fetch = async (url, opts) => {
        if (opts.method === 'POST') {
            return { ok: false, status: 409, text: async () => 'duplicate key' };
        }
        if (opts.method === 'GET') {
            return { ok: true, json: async () => [{ message_id: 'msg_stale_concurrent', status: 'processing', started_at: staleTime }] };
        }
        if (opts.method === 'PATCH') {
            return { ok: true, json: async () => [] }; // 0 rows updated by second worker
        }
        return { ok: false };
    };

    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';

    const res = await claimWhatsAppMessage('msg_stale_concurrent', '+56912345678');
    assert.equal(res.claimed, false);
    assert.equal(res.status, 'processing');

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});
