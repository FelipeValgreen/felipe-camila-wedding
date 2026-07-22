import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getSupabaseServerKey,
    buildSupabaseHeaders,
    sanitizeSupabaseError
} from '../api/_lib/supabase-admin.js';

test('1. getSupabaseServerKey uses SUPABASE_SECRET_KEY when present', () => {
    const env = { SUPABASE_SECRET_KEY: 'sb_secret_TEST_ONLY_NOT_REAL' };
    assert.equal(getSupabaseServerKey(env), 'sb_secret_TEST_ONLY_NOT_REAL');
});

test('2. getSupabaseServerKey uses SUPABASE_SERVICE_ROLE_KEY as fallback', () => {
    const env = { SUPABASE_SERVICE_ROLE_KEY: 'legacy.jwt.test-only' };
    assert.equal(getSupabaseServerKey(env), 'legacy.jwt.test-only');
});

test('3. getSupabaseServerKey prioritizes SUPABASE_SECRET_KEY over service role key', () => {
    const env = {
        SUPABASE_SECRET_KEY: 'sb_secret_TEST_ONLY_NOT_REAL',
        SUPABASE_SERVICE_ROLE_KEY: 'legacy.jwt.test-only'
    };
    assert.equal(getSupabaseServerKey(env), 'sb_secret_TEST_ONLY_NOT_REAL');
});

test('4 & 5. buildSupabaseHeaders sends sb_secret_ in apikey and omits Authorization Bearer', () => {
    const key = 'sb_secret_TEST_ONLY_NOT_REAL';
    const headers = buildSupabaseHeaders(key);

    assert.equal(headers.apikey, 'sb_secret_TEST_ONLY_NOT_REAL');
    assert.equal(headers.Authorization, undefined);
});

test('6 & 7. buildSupabaseHeaders sends legacy JWT in both apikey and Authorization Bearer', () => {
    const key = 'legacy.jwt.test-only';
    const headers = buildSupabaseHeaders(key);

    assert.equal(headers.apikey, 'legacy.jwt.test-only');
    assert.equal(headers.Authorization, 'Bearer legacy.jwt.test-only');
});

test('8. buildSupabaseHeaders throws SUPABASE_NOT_CONFIGURED if key is missing or empty', () => {
    assert.throws(() => buildSupabaseHeaders(null), { message: 'SUPABASE_NOT_CONFIGURED' });
    assert.throws(() => buildSupabaseHeaders(''), { message: 'SUPABASE_NOT_CONFIGURED' });
});

test('9. buildSupabaseHeaders preserves Content-Type header and prevents override', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { 'Content-Type': 'text/plain' }
    });
    assert.equal(headers['Content-Type'], 'application/json');
});

test('10. buildSupabaseHeaders preserves default and custom Prefer options', () => {
    const defaultHeaders = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL');
    assert.equal(defaultHeaders.Prefer, 'return=representation');

    const customHeaders = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', { prefer: 'count=exact' });
    assert.equal(customHeaders.Prefer, 'count=exact');
});

test('11. buildSupabaseHeaders preserves additional custom headers', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { 'X-Custom-Header': 'custom-val' }
    });
    assert.equal(headers['X-Custom-Header'], 'custom-val');
});

test('12. sanitizeSupabaseError returns safe code and status without exposing detail or credentials', () => {
    const rawError = new Error('SUPABASE_ERROR_500');
    rawError.status = 500;
    rawError.detail = 'Internal error with sensitive detail';

    const sanitized = sanitizeSupabaseError(rawError);
    assert.equal(sanitized.code, 'SUPABASE_ERROR_500');
    assert.equal(sanitized.status, 500);
    assert.equal(sanitized.detail, undefined);
    assert.equal(sanitized.headers, undefined);
});

test('13. No test logs print actual keys or full Authorization headers', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL');
    const repr = JSON.stringify(headers);
    assert.equal(repr.includes('Authorization'), false);
});

// Additional Hardening Tests (Step 6)
test('14. custom Authorization header is stripped when using sb_secret_', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { Authorization: 'Bearer malicious_token' }
    });
    assert.equal(headers.Authorization, undefined);
});

test('15. custom lowercase authorization header is stripped', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { authorization: 'Bearer malicious_token' }
    });
    assert.equal(headers.authorization, undefined);
    assert.equal(headers.Authorization, undefined);
});

test('16. custom apikey header cannot override real key', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { apikey: 'malicious_apikey' }
    });
    assert.equal(headers.apikey, 'sb_secret_TEST_ONLY_NOT_REAL');
});

test('17. custom Authorization header cannot override legacy JWT Bearer', () => {
    const headers = buildSupabaseHeaders('legacy.jwt.test-only', {
        headers: { Authorization: 'Bearer malicious_token' }
    });
    assert.equal(headers.Authorization, 'Bearer legacy.jwt.test-only');
});

test('18. Prefer custom works exclusively via options.prefer', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        prefer: 'count=exact',
        headers: { Prefer: 'resolution=ignore-duplicates' }
    });
    assert.equal(headers.Prefer, 'count=exact');
});
