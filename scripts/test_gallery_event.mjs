import assert from 'node:assert/strict';
import handler from '../api/gallery.js';

const rows = [
  { url: 'https://example.test/storage/guest_uploads/guest_old.jpg', created_at: '2026-01-10T12:00:00Z' },
  { url: 'https://example.test/storage/guest_uploads/guest_civil.jpg', created_at: '2026-03-28T12:00:00Z' },
  { url: 'https://example.test/storage/guest_uploads/guest_new.jpg?source=qr&event=matri2026', created_at: '2026-10-20T19:06:59Z' }
];
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => ({ ok: true, json: async () => rows });
function mockRes() {
  return {
    headers: {},
    setHeader(key, value) { this.headers[key] = value; return this; },
    status(code) { this.code = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}
try {
  const res = mockRes();
  await handler({ method: 'GET', query: { refresh: '1' } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.items.map(x => x.category), ['historia', 'civil', 'matrimonio']);
  assert.equal(res.body.items[2].src, rows[2].url);
  assert.match(res.headers['Cache-Control'], /no-store/);
  const badMethod = mockRes();
  await handler({ method: 'POST', query: {} }, badMethod);
  assert.equal(badMethod.code, 405);
  console.log('PASS: gallery event categorization, URL preservation, refresh cache, method guard');
} finally {
  globalThis.fetch = originalFetch;
}
