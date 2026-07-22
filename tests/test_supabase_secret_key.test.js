import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getSupabaseServerKey,
    buildSupabaseHeaders,
    sanitizeSupabaseError
} from '../api/_lib/supabase-admin.js';

function countHeaderNames(headers, expectedName) {
    return Object.keys(headers)
        .filter(name => name.toLowerCase() === expectedName.toLowerCase())
        .length;
}

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
    assert.equal(countHeaderNames(headers, 'authorization'), 0);
});

test('6 & 7. buildSupabaseHeaders sends legacy JWT in both apikey and Authorization Bearer', () => {
    const key = 'legacy.jwt.test-only';
    const headers = buildSupabaseHeaders(key);

    assert.equal(headers.apikey, 'legacy.jwt.test-only');
    assert.equal(headers.Authorization, 'Bearer legacy.jwt.test-only');
    assert.equal(countHeaderNames(headers, 'authorization'), 1);
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
    assert.equal(countHeaderNames(headers, 'content-type'), 1);
});

test('10. buildSupabaseHeaders preserves default and custom Prefer options', () => {
    const defaultHeaders = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL');
    assert.equal(defaultHeaders.Prefer, 'return=representation');

    const customHeaders = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', { prefer: 'count=exact' });
    assert.equal(customHeaders.Prefer, 'count=exact');
    assert.equal(countHeaderNames(customHeaders, 'prefer'), 1);
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

// Case-Insensitive Protected Headers Verification Tests (Step 3)
test('14. AUTHORIZATION uppercase custom header is stripped with sb_secret_', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { AUTHORIZATION: 'Bearer malicious_token' }
    });
    assert.equal(countHeaderNames(headers, 'authorization'), 0);
});

test('15. AuthoriZation mixed case custom header is stripped with sb_secret_', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { AuthoriZation: 'Bearer malicious_token' }
    });
    assert.equal(countHeaderNames(headers, 'authorization'), 0);
});

test('16. APIKEY uppercase custom header cannot override real key', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { APIKEY: 'malicious_apikey' }
    });
    assert.equal(headers.apikey, 'sb_secret_TEST_ONLY_NOT_REAL');
    assert.equal(countHeaderNames(headers, 'apikey'), 1);
});

test('17. ApiKey mixed case custom header cannot override real key', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { ApiKey: 'malicious_apikey' }
    });
    assert.equal(headers.apikey, 'sb_secret_TEST_ONLY_NOT_REAL');
    assert.equal(countHeaderNames(headers, 'apikey'), 1);
});

test('18. content-type lowercase custom header cannot override application/json', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { 'content-type': 'text/html' }
    });
    assert.equal(headers['Content-Type'], 'application/json');
    assert.equal(countHeaderNames(headers, 'content-type'), 1);
});

test('19. CONTENT-TYPE uppercase custom header cannot override application/json', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { 'CONTENT-TYPE': 'text/html' }
    });
    assert.equal(headers['Content-Type'], 'application/json');
    assert.equal(countHeaderNames(headers, 'content-type'), 1);
});

test('20. prefer lowercase custom header cannot override options.prefer', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        prefer: 'count=exact',
        headers: { prefer: 'resolution=ignore-duplicates' }
    });
    assert.equal(headers.Prefer, 'count=exact');
    assert.equal(countHeaderNames(headers, 'prefer'), 1);
});

test('21. PREFER uppercase custom header cannot override options.prefer', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        prefer: 'count=exact',
        headers: { PREFER: 'resolution=ignore-duplicates' }
    });
    assert.equal(headers.Prefer, 'count=exact');
    assert.equal(countHeaderNames(headers, 'prefer'), 1);
});

test('22. legacy key produces exactly one authorization header case-insensitive', () => {
    const headers = buildSupabaseHeaders('legacy.jwt.test-only', {
        headers: { AUTHORIZATION: 'Bearer malicious_token' }
    });
    assert.equal(countHeaderNames(headers, 'authorization'), 1);
    assert.equal(headers.Authorization, 'Bearer legacy.jwt.test-only');
});

test('23. modern key produces zero authorization headers case-insensitive', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { AUTHORIZATION: 'Bearer malicious_token', authorization: 'Bearer token2' }
    });
    assert.equal(countHeaderNames(headers, 'authorization'), 0);
});

test('24. apikey header is exactly one case-insensitive for both modern and legacy keys', () => {
    const modernHeaders = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', { headers: { APIKEY: 'test' } });
    const legacyHeaders = buildSupabaseHeaders('legacy.jwt.test-only', { headers: { APIKEY: 'test' } });
    assert.equal(countHeaderNames(modernHeaders, 'apikey'), 1);
    assert.equal(countHeaderNames(legacyHeaders, 'apikey'), 1);
});

test('25. X-Custom-Header continues to be preserved cleanly', () => {
    const headers = buildSupabaseHeaders('sb_secret_TEST_ONLY_NOT_REAL', {
        headers: { 'X-Custom-Header': 'valid_value' }
    });
    assert.equal(headers['X-Custom-Header'], 'valid_value');
});
