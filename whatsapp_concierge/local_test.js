const crypto = require('crypto');
const MockDatabase = require('./mock_database');
const WebhookHandler = require('./webhook_handler');
const ConciergeEngine = require('./concierge_engine');

// Helper to sign mock Meta payload
function signPayload(body, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  return 'sha256=' + hmac.digest('hex');
}

async function runTests() {
  console.log('=== STARTING WHATSAPP CONCIERGE LOCAL TEST SUITE ===\n');

  const VERIFY_TOKEN = 'my_secret_verify_token';
  const APP_SECRET = 'my_secret_app_secret';

  // Set default environment variables
  process.env.AI_PROVIDER = 'openai';
  process.env.AI_MODE = 'active';

  let db = new MockDatabase();
  let webhook = new WebhookHandler(VERIFY_TOKEN, APP_SECRET, db);
  let engine = new ConciergeEngine(db);

  // ----------------------------------------------------
  // Test Case 1: Subscription Verification (GET webhook)
  // ----------------------------------------------------
  console.log('Test 1: Webhook Subscription Verification (GET)');
  const verifyQuery = {
    'hub.mode': 'subscribe',
    'hub.verify_token': VERIFY_TOKEN,
    'hub.challenge': 'chall_12345'
  };
  const verifyResult = webhook.verifySubscription(verifyQuery);
  console.log(`  Result: ${verifyResult.ok && verifyResult.challenge === 'chall_12345' ? 'PASS' : 'FAIL'}`);
  console.log(`  Payload Output:`, verifyResult);

  // ----------------------------------------------------
  // Test Case 2: Unsigned Webhook Rejection (Security check)
  // ----------------------------------------------------
  console.log('\nTest 2: Webhook signature verification fails for malformed signature');
  const payloadDataText = { entry: [{ changes: [{ value: { messages: [{ id: 'm_1', from: '56911112222', type: 'text', text: { body: 'Hola' } }] } }] }] };
  const rawBodyText = JSON.stringify(payloadDataText);
  const badSignature = 'sha256=invalidhashvalue';
  const ingestResult = await webhook.ingest(rawBodyText, badSignature, payloadDataText);
  console.log(`  Result: ${!ingestResult.ok && ingestResult.status === 401 ? 'PASS' : 'FAIL'}`);
  console.log(`  Ingest Output:`, ingestResult);

  // ----------------------------------------------------
  // Test Case 3: Inbound query on recognized phone number (Factual knowledge check)
  // ----------------------------------------------------
  console.log('\nTest 3: Factual response for recognized guest asking about ceremony time');
  db = new MockDatabase(); // Fresh state
  webhook = new WebhookHandler(VERIFY_TOKEN, APP_SECRET, db);
  engine = new ConciergeEngine(db);

  const payloadQuery = { entry: [{ changes: [{ value: { messages: [{ id: 'm_query', from: '56911112222', type: 'text', text: { body: '¿A qué hora es la ceremonia?' } }] } }] }] };
  const rawBodyQuery = JSON.stringify(payloadQuery);
  const validSignatureQuery = signPayload(rawBodyQuery, APP_SECRET);
  const ingestOkQuery = await webhook.ingest(rawBodyQuery, validSignatureQuery, payloadQuery);
  
  if (ingestOkQuery.ok && ingestOkQuery.event) {
    const response = await engine.processInboundMessage(ingestOkQuery.event);
    const hasCorrectFact = response.text.includes('Santuario de la Divina Misericordia');
    console.log(`  Result: ${response.ok && hasCorrectFact ? 'PASS' : 'FAIL'}`);
    console.log(`  AI Concierge Reply: "${response.text}"`);
    console.log(`  Used Provider:`, response.metadata);
  }

  // ----------------------------------------------------
  // Test Case 4: Deduplication validation (Idempotency)
  // ----------------------------------------------------
  console.log('\nTest 4: Ignore duplicate Meta message ID');
  const duplicateResult = await webhook.ingest(rawBodyQuery, validSignatureQuery, payloadQuery);
  console.log(`  Result: ${duplicateResult.ok && duplicateResult.duplicate ? 'PASS' : 'FAIL'}`);
  console.log(`  Duplicate Output:`, duplicateResult);

  // ----------------------------------------------------
  // Test Case 5: RSVP confirm tool execution
  // ----------------------------------------------------
  console.log('\nTest 5: Execute confirm_attendance tool for recognized guest');
  db = new MockDatabase(); // Fresh state
  webhook = new WebhookHandler(VERIFY_TOKEN, APP_SECRET, db);
  engine = new ConciergeEngine(db);

  const rsvpPayload = { entry: [{ changes: [{ value: { messages: [{ id: 'm_rsvp', from: '56911112222', type: 'text', text: { body: 'Confirmo mi asistencia' } }] } }] }] };
  const rsvpBody = JSON.stringify(rsvpPayload);
  const rsvpSig = signPayload(rsvpBody, APP_SECRET);
  const rsvpIngest = await webhook.ingest(rsvpBody, rsvpSig, rsvpPayload);

  if (rsvpIngest.ok && rsvpIngest.event) {
    const response = await engine.processInboundMessage(rsvpIngest.event);
    const hasRSVPSaved = db.rsvps.find(r => r.guest_id === 'g1' && r.attending === true);
    console.log(`  Result: ${response.ok && hasRSVPSaved ? 'PASS' : 'FAIL'}`);
    console.log(`  AI Concierge Reply: "${response.text}"`);
    console.log(`  DB RSVP Record:`, hasRSVPSaved);
  }

  // ----------------------------------------------------
  // Test Case 6: Block tool execution for unknown guest
  // ----------------------------------------------------
  console.log('\nTest 6: Block confirm_attendance write tool for unknown phone number');
  const unknownPayload = { entry: [{ changes: [{ value: { messages: [{ id: 'm_unk', from: '56999999999', type: 'text', text: { body: 'Confirmo mi asistencia' } }] } }] }] };
  const unknownBody = JSON.stringify(unknownPayload);
  const unknownSig = signPayload(unknownBody, APP_SECRET);
  const unknownIngest = await webhook.ingest(unknownBody, unknownSig, unknownPayload);

  if (unknownIngest.ok && unknownIngest.event) {
    const response = await engine.processInboundMessage(unknownIngest.event);
    console.log(`  Result: ${response.ok && response.text.includes('código') ? 'PASS' : 'FAIL'}`);
    console.log(`  AI Concierge Reply: "${response.text}"`);
  }

  // ----------------------------------------------------
  // Test Case 7: Human Handoff triggers and locks thread
  // ----------------------------------------------------
  console.log('\nTest 7: Handoff creates record, pauses AI on the thread');
  db = new MockDatabase(); // Fresh state
  webhook = new WebhookHandler(VERIFY_TOKEN, APP_SECRET, db);
  engine = new ConciergeEngine(db);

  const handoffPayload = { entry: [{ changes: [{ value: { messages: [{ id: 'm_hand', from: '56911112222', type: 'text', text: { body: 'Quiero hablar con un humano' } }] } }] }] };
  const handoffBody = JSON.stringify(handoffPayload);
  const handoffSig = signPayload(handoffBody, APP_SECRET);
  const handoffIngest = await webhook.ingest(handoffBody, handoffSig, handoffPayload);

  if (handoffIngest.ok && handoffIngest.event) {
    const response = await engine.processInboundMessage(handoffIngest.event);
    const thread = db.threads.find(t => t.phone_number === '56911112222');
    const handoffSaved = db.handoffs.length > 0;
    console.log(`  Result: ${response.ok && thread.ai_paused && handoffSaved ? 'PASS' : 'FAIL'}`);
    console.log(`  AI Concierge Reply: "${response.text}"`);
    console.log(`  Thread Pause State:`, thread);
    console.log(`  Database Handoff Logs:`, db.handoffs);
  }

  // ----------------------------------------------------
  // Test Case 8: Paused thread suppresses AI replies
  // ----------------------------------------------------
  console.log('\nTest 8: AI Concierge suppresses response on thread locked by operator');
  const postHandoffPayload = { entry: [{ changes: [{ value: { messages: [{ id: 'm_post_hand', from: '56911112222', type: 'text', text: { body: '¿A qué hora es el evento?' } }] } }] }] };
  const postHandoffBody = JSON.stringify(postHandoffPayload);
  const postHandoffSig = signPayload(postHandoffBody, APP_SECRET);
  const postHandoffIngest = await webhook.ingest(postHandoffBody, postHandoffSig, postHandoffPayload);

  if (postHandoffIngest.ok && postHandoffIngest.event) {
    const response = await engine.processInboundMessage(postHandoffIngest.event);
    console.log(`  Result: ${response.ok && response.status === 'paused_by_human' && response.text === '' ? 'PASS' : 'FAIL'}`);
    console.log(`  AI Concierge Suppressed Reply Output:`, response);
  }

  // ----------------------------------------------------
  // Test Case 9: Gemini Provider selection
  // ----------------------------------------------------
  console.log('\nTest 9: Environment switch to Gemini provider works');
  process.env.AI_PROVIDER = 'gemini';
  db = new MockDatabase(); // Fresh state
  webhook = new WebhookHandler(VERIFY_TOKEN, APP_SECRET, db);
  engine = new ConciergeEngine(db);

  const geminiPayload = { entry: [{ changes: [{ value: { messages: [{ id: 'm_gem', from: '56922223333', type: 'text', text: { body: '¿A qué hora empieza la boda?' } }] } }] }] };
  const geminiBody = JSON.stringify(geminiPayload);
  const geminiSig = signPayload(geminiBody, APP_SECRET);
  const geminiIngest = await webhook.ingest(geminiBody, geminiSig, geminiPayload);

  if (geminiIngest.ok && geminiIngest.event) {
    const response = await engine.processInboundMessage(geminiIngest.event);
    const hasCorrectFact = response.text.includes('Santuario de la Divina Misericordia');
    console.log(`  Result: ${response.ok && hasCorrectFact ? 'PASS' : 'FAIL'}`);
    console.log(`  AI Concierge Reply: "${response.text}"`);
    console.log(`  Used Provider:`, response.metadata);
  }

  console.log('\n=== ALL CONCIERGE INTEGRATION TESTS COMPLETE ===');
}

runTests().catch(console.error);
