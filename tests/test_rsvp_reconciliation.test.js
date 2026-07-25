import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { normalizeName } from '../api/_lib/rsvp-service.js';
import { mapRSVPStatusToSheet } from '../api/_lib/google-sheets.js';

// Load environment variables for tests
const envPath = path.resolve('gestion/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1');
}

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || 'https://mwumnywbvjxekskfrlms.supabase.co';
const SERVICE_ROLE_KEY = envVars.SUPABASE_SECRET_KEY;
const ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function runTests() {
  console.log('=== RUNNING RSVP RECONCILIATION & SECURITY SUITE ===\n');

  // 1. Name Normalization Tests
  assert.strictEqual(normalizeName('  Felipe   Valenzuela  '), 'felipe valenzuela');
  assert.strictEqual(normalizeName('Camila ÁLVAREZó'), 'camila alvarezo');
  console.log('✅ 1. Name Normalization tests passed.');

  // 2. Google Sheets Status Mapping
  assert.strictEqual(mapRSVPStatusToSheet('attending', 'web'), 'Confirmado Web');
  assert.strictEqual(mapRSVPStatusToSheet('not_attending', 'web'), 'No Asiste');
  assert.strictEqual(mapRSVPStatusToSheet('pending', 'web'), 'Pendiente');
  console.log('✅ 2. Google Sheets Status Mapping tests passed.');

  // 3. Security Test: ANON role must NOT be able to execute reconcile_rsvp_system
  const anonRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reconcile_rsvp_system`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_rsvp_id: '00000000-0000-0000-0000-000000000000' })
  });
  assert.strictEqual(anonRes.status, 401, 'Anonymous user must be denied RPC execution with 401');
  console.log('✅ 3. Security Grant Test: Anonymous access correctly denied (HTTP 401).');

  // 4. Security Test: SERVICE_ROLE role CAN execute reconcile_rsvp_system
  const serviceRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reconcile_rsvp_system`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_rsvp_id: '00000000-0000-0000-0000-000000000000' })
  });
  assert.strictEqual(serviceRes.status, 200, 'Service role must be authorized with 200');
  const serviceBody = await serviceRes.json();
  assert.strictEqual(serviceBody.ok, false);
  assert.strictEqual(serviceBody.error, 'RSVP_NOT_FOUND');
  console.log('✅ 4. Security Grant Test: Service Role authorized (HTTP 200).');

  console.log('\n✨ ALL RSVP RECONCILIATION TESTS PASSED SUCCESSFULLY! ✨\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
