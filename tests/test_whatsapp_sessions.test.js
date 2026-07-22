import test from 'node:test';
import assert from 'node:assert/strict';

import { claimWhatsAppMessage, markWhatsAppMessageStatus, getRSVPsByPhoneSanitized } from '../api/_lib/supabase-admin.js';

test('H1. getRSVPsByPhoneSanitized requires SUPABASE_URL and returns failure without env', async () => {
    try {
        await getRSVPsByPhoneSanitized('+56912345678');
        assert.fail('Should have thrown SUPABASE_NOT_CONFIGURED');
    } catch (err) {
        assert.equal(err.message, 'SUPABASE_NOT_CONFIGURED');
    }
});

test('H2. claimWhatsAppMessage requires SUPABASE_URL and throws without env', async () => {
    try {
        await claimWhatsAppMessage('msg_123', '+56912345678');
        assert.fail('Should have thrown SUPABASE_NOT_CONFIGURED');
    } catch (err) {
        assert.equal(err.message, 'SUPABASE_NOT_CONFIGURED');
    }
});

test('H3. markWhatsAppMessageStatus requires SUPABASE_URL and throws without env', async () => {
    try {
        await markWhatsAppMessageStatus('msg_123', 'processed');
        assert.fail('Should have thrown SUPABASE_NOT_CONFIGURED');
    } catch (err) {
        assert.equal(err.message, 'SUPABASE_NOT_CONFIGURED');
    }
});
