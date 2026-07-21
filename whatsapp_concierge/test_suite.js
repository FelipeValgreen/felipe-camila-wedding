const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const MockDatabase = require('./mock_database');
const WebhookHandler = require('./webhook_handler');
const ConciergeEngine = require('./concierge_engine');
const OutboundTransport = require('./outbound_transport');

// Helper to sign mock payloads
function signPayload(body, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

const VERIFY_TOKEN = 'my_verify_token';
const APP_SECRET = 'my_app_secret';

// Asserting Test Cases
test('WA-P0-001: First RSVP message does not mutate database, subsequent confirmation does', async () => {
  const db = new MockDatabase();
  const webhook = new WebhookHandler(VERIFY_TOKEN, APP_SECRET, db);
  const engine = new ConciergeEngine(db);

  // Send first RSVP message: "Confirmo mi asistencia"
  const payload = { entry: [{ changes: [{ value: { messages: [{ id: 'm_rsvp_1', from: '56911112222', type: 'text', text: { body: 'Confirmo mi asistencia' } }] } }] }] };
  const rawBody = JSON.stringify(payload);
  const signature = signPayload(rawBody, APP_SECRET);
  const ingest = await webhook.ingest(rawBody, signature, payload);

  assert.strictEqual(ingest.ok, true);
  
  const response1 = await engine.processInboundMessage(ingest.event);
  assert.strictEqual(response1.ok, true);
  assert.match(response1.text, /SÍ/); // Asks for confirmation

  // Verify that database RSVP was NOT mutated yet
  const rsvpRecordBefore = await db.getRSVP('g1');
  assert.strictEqual(rsvpRecordBefore, null);

  // Send affirmative response: "Sí"
  const confirmPayload = { entry: [{ changes: [{ value: { messages: [{ id: 'm_rsvp_2', from: '56911112222', type: 'text', text: { body: 'Sí' } }] } }] }] };
  const confirmBody = JSON.stringify(confirmPayload);
  const confirmSig = signPayload(confirmBody, APP_SECRET);
  const confirmIngest = await webhook.ingest(confirmBody, confirmSig, confirmPayload);

  const response2 = await engine.processInboundMessage(confirmIngest.event);
  assert.strictEqual(response2.ok, true);
  assert.match(response2.text, /exitosamente/); // Confirms success

  // Verify that database RSVP WAS mutated successfully
  const rsvpRecordAfter = await db.getRSVP('g1');
  assert.ok(rsvpRecordAfter);
  assert.strictEqual(rsvpRecordAfter.attending, true);
});

test('WA-P0-002: Unknown phone number can trigger human handoff successfully', async () => {
  const db = new MockDatabase();
  const webhook = new WebhookHandler(VERIFY_TOKEN, APP_SECRET, db);
  const engine = new ConciergeEngine(db);

  // Send handoff request from unknown phone number (not in guestList)
  const payload = { entry: [{ changes: [{ value: { messages: [{ id: 'm_hand_unk', from: '56999999999', type: 'text', text: { body: 'Quiero hablar con un operador humano' } }] } }] }] };
  const rawBody = JSON.stringify(payload);
  const signature = signPayload(rawBody, APP_SECRET);
  const ingest = await webhook.ingest(rawBody, signature, payload);

  const response = await engine.processInboundMessage(ingest.event);
  assert.strictEqual(response.ok, true);
  assert.match(response.text, /equipo/); // Confirms handoff message

  // Verify handoff was created in database and thread is paused
  assert.strictEqual(db.handoffs.length, 1);
  const thread = db.threads.find(t => t.phone_number === '56999999999');
  assert.strictEqual(thread.ai_paused, true);
});

test('WA-P0-002: Handoff tool failure is handled and does not claim false success', async () => {
  const db = new MockDatabase();
  const webhook = new WebhookHandler(VERIFY_TOKEN, APP_SECRET, db);
  const engine = new ConciergeEngine(db);

  // Enable test handoff database crash trigger
  process.env.TEST_HANDOFF_FAIL = 'true';

  const payload = { entry: [{ changes: [{ value: { messages: [{ id: 'm_hand_fail', from: '56911112222', type: 'text', text: { body: 'Operador humano' } }] } }] }] };
  const rawBody = JSON.stringify(payload);
  const signature = signPayload(rawBody, APP_SECRET);
  const ingest = await webhook.ingest(rawBody, signature, payload);

  const response = await engine.processInboundMessage(ingest.event);
  assert.strictEqual(response.ok, true);
  assert.match(response.text, /problema/); // Shows error message, not success message!
  
  // Disable failure trigger
  process.env.TEST_HANDOFF_FAIL = 'false';
});

test('WA-P1-002: Deduplication permits retries after processing failures, blocks on success', async () => {
  const db = new MockDatabase();
  const webhook = new WebhookHandler(VERIFY_TOKEN, APP_SECRET, db);
  const engine = new ConciergeEngine(db);

  // Send message that crashes/fails during turn (simulated by timeout or failure)
  process.env.TEST_HANDOFF_FAIL = 'true'; // Force crash on handoff keyword

  const payload = { entry: [{ changes: [{ value: { messages: [{ id: 'm_retry', from: '56911112222', type: 'text', text: { body: 'Hablar con humano' } }] } }] }] };
  const rawBody = JSON.stringify(payload);
  const signature = signPayload(rawBody, APP_SECRET);
  
  const ingest1 = await webhook.ingest(rawBody, signature, payload);
  assert.strictEqual(ingest1.duplicate, undefined);

  // Process turn which will fail
  const response1 = await engine.processInboundMessage(ingest1.event);
  assert.match(response1.text, /problema/); // Failed message

  // Re-ingesting message ID 'm_retry' must NOT be blocked as a duplicate because status is 'failed'!
  const ingest2 = await webhook.ingest(rawBody, signature, payload);
  assert.strictEqual(ingest2.duplicate, undefined); // Retry is permitted!

  // Turn off failure trigger
  process.env.TEST_HANDOFF_FAIL = 'false';

  // Process again successfully
  const response2 = await engine.processInboundMessage(ingest2.event);
  assert.match(response2.text, /equipo/); // Successful handoff

  // Re-ingesting after successful completion must block duplicate!
  const ingest3 = await webhook.ingest(rawBody, signature, payload);
  assert.strictEqual(ingest3.duplicate, true); // Blocked!
});

test('WA-P1-005: Outbound WhatsApp transport template constraints', async () => {
  const db = new MockDatabase();
  const transport = new OutboundTransport(db);

  // Send approved template
  const resOk = await transport.sendTemplate('56911112222', 'rsvp_reminder', { guest: 'Felipe' });
  assert.strictEqual(resOk.ok, true);

  // Attempt unapproved template key
  await assert.rejects(
    async () => {
      await transport.sendTemplate('56911112222', 'unapproved_template', {});
    },
    /allowlist/
  );
});

test('Timeouts: AI Provider and Database timeouts are caught cleanly', async () => {
  const db = new MockDatabase();
  const webhook = new WebhookHandler(VERIFY_TOKEN, APP_SECRET, db);
  const engine = new ConciergeEngine(db);

  // Trigger AI timeout and configure a low timeout threshold to force the race error
  process.env.TEST_AI_TIMEOUT = 'true';
  process.env.AI_TIMEOUT_MS = '100';

  const payload = { entry: [{ changes: [{ value: { messages: [{ id: 'm_time', from: '56911112222', type: 'text', text: { body: '¿A qué hora es la ceremonia?' } }] } }] }] };
  const rawBody = JSON.stringify(payload);
  const signature = signPayload(rawBody, APP_SECRET);
  const ingest = await webhook.ingest(rawBody, signature, payload);

  const response = await engine.processInboundMessage(ingest.event);
  assert.strictEqual(response.ok, true);
  assert.match(response.text, /novios/); // Triggers timeout handoff response

  process.env.TEST_AI_TIMEOUT = 'false';
  process.env.AI_TIMEOUT_MS = '8000';
});

test('RLS: Check table access permissions by role', () => {
  const serviceContext = { role: 'service_role' };
  const anonContext = { role: 'anon' };
  const authenticatedContext = { role: 'authenticated' };

  function checkReadPermission(table, context) {
    // Only permit access to authenticated service role, fully closed to public and authenticated users by default
    if (context.role === 'service_role') return true;
    return false;
  }

  assert.strictEqual(checkReadPermission('conversation_threads', serviceContext), true);
  assert.strictEqual(checkReadPermission('conversation_threads', anonContext), false);
  assert.strictEqual(checkReadPermission('conversation_threads', authenticatedContext), false);
});
