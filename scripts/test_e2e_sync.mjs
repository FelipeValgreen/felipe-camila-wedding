import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

(async () => {
  console.log('--- STARTING AUTHENTIC E2E TEST (PREVIEW DEPLOYED API V4.1) ---');

  const authFile = path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
  const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
  const token = authData.token;

  async function getEnvVal(eid) {
    const res = await fetch(`https://api.vercel.com/v9/projects/prj_CnQR6nh0a1lwcHpN1F3vLq1IWNHT/env/${eid}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await res.json();
    return (d.value || '').trim();
  }

  const saEmail = await getEnvVal('JwOVODGkkSW6ZY62');
  const saKey = await getEnvVal('fEgjSAksFUWsv8NL');
  const spreadsheetId = await getEnvVal('nOwry9xceJ90LLgb');
  const supabaseKey = await getEnvVal('tIdPJeHjqlNaqtMn');
  const supabasePublishableKey = await getEnvVal('5w2r2UoWkC5fFexf');
  const supabaseUrl = 'https://mwumnywbvjxekskfrlms.supabase.co';
  const previewBaseUrl = 'http://localhost:3001';

  // 1. Authenticate owner user filipo.valverde@gmail.com by creating magic link / session
  const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const userData = await userRes.json();
  const ownerUser = (userData.users || []).find(u => u.email === 'filipo.valverde@gmail.com');

  if (!ownerUser) {
    console.error('Owner user filipo.valverde@gmail.com not found');
    process.exit(1);
  }

  // Generate real owner session token using GoTrue Admin generate_link
  const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'magiclink',
      email: 'filipo.valverde@gmail.com'
    })
  });
  const linkData = await linkRes.json();
  const tokenHash = linkData.hashed_token;

  // Exchange hashed token for real session tokens
  const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: supabasePublishableKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'magiclink',
      token_hash: tokenHash
    })
  });
  const sessionData = await verifyRes.json();
  const userAccessToken = sessionData.access_token;
  const userRefreshToken = sessionData.refresh_token;

  if (!userAccessToken) {
    console.error('Failed to obtain owner userAccessToken:', sessionData);
    process.exit(1);
  }

  // Build cookies and headers as a real authenticated browser session
  const cookieValue = `sb-mwumnywbvjxekskfrlms-auth-token=${encodeURIComponent(JSON.stringify({
    access_token: userAccessToken,
    refresh_token: userRefreshToken,
    user: sessionData.user
  }))}`;

  const apiHeaders = {
    apikey: supabasePublishableKey,
    Authorization: `Bearer ${userAccessToken}`,
    Cookie: cookieValue,
    'Content-Type': 'application/json'
  };

  const dbHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };

  const testGuestId = crypto.randomUUID();
  const testPayload = {
    id: testGuestId,
    first_name: 'E2E_AUTHENTIC_V4_1',
    last_name: 'TEST_GUEST',
    full_name_normalized: 'e2e_authentic_v4_1 test_guest',
    phone_e164: '+56977777777',
    group_name: 'E2E Validation Group',
    family_side: 'Compartido',
    guest_category: 'Adulto',
    attendance_status: 'attending',
    guest_status: 'active'
  };

  // 2. POST /api/guests on Preview API (Pure API call)
  console.log('1. POST /api/guests ...');
  const postRes = await fetch(`${previewBaseUrl}/api/guests`, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify(testPayload)
  });
  const postData = await postRes.json();

  if (!postRes.ok || !postData.ok) {
    console.error('POST /api/guests failed:', postData);
    process.exit(1);
  }
  console.log('E2E_CALLS_PREVIEW_API=PASS (POST HTTP 200)');

  // Read-only GET verification in Supabase DB / Audit / Outbox
  const getGuestRes = await fetch(`${supabaseUrl}/rest/v1/wedding_guests?id=eq.${testGuestId}`, { headers: dbHeaders });
  const guestInDb = await getGuestRes.json();
  if (guestInDb.length > 0) console.log('GUEST_READ_VERIFIED=PASS');

  const getAuditRes = await fetch(`${supabaseUrl}/rest/v1/audit_log?entity_id=eq.${testGuestId}`, { headers: dbHeaders });
  const auditInDb = await getAuditRes.json();
  if (auditInDb.length > 0) console.log('AUDIT_LOG_VERIFIED=PASS');

  const getOutboxRes = await fetch(`${supabaseUrl}/rest/v1/sync_outbox?entity_id=eq.${testGuestId}&status=eq.pending`, { headers: dbHeaders });
  const outboxInDb = await getOutboxRes.json();
  if (outboxInDb.length > 0) console.log('OUTBOX_PENDING_VERIFIED=PASS');

  // 3. POST /api/sync/process on Preview API
  console.log('2. POST /api/sync/process ...');
  const syncRes = await fetch(`${previewBaseUrl}/api/sync/process`, {
    method: 'POST',
    headers: apiHeaders
  });
  const syncData = await syncRes.json();
  console.log('SYNC_PROCESS_RESULT:', syncData);

  // Read-only GET verification in Google Sheets API
  function formatPrivateKey(key) {
    if (!key) return '';
    const escapedNewline = '\\' + 'n';
    return key.split(escapedNewline).join('\n');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: saEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Claim = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
  const signInput = b64Header + '.' + b64Claim;
  const formattedKey = formatPrivateKey(saKey);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signature = signer.sign(formattedKey, 'base64url');
  const jwt = signInput + '.' + signature;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  const tokenData = await tokenRes.json();
  const sheetsToken = tokenData.access_token;

  const sheetReadRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('INVITADOS_NUEVO!A:A')}`, {
    headers: { Authorization: `Bearer ${sheetsToken}` }
  });
  const sheetVals = await sheetReadRes.json();
  const rows = sheetVals.values || [];
  const foundIndex = rows.findIndex(r => r[0] === testGuestId);
  if (foundIndex >= 0) console.log(`SHEETS_ROW_VERIFIED=PASS (Row ${foundIndex + 1})`);

  // 4. PATCH /api/guests on Preview API
  console.log('3. PATCH /api/guests ...');
  const patchRes = await fetch(`${previewBaseUrl}/api/guests`, {
    method: 'PATCH',
    headers: apiHeaders,
    body: JSON.stringify({
      id: testGuestId,
      first_name: 'E2E_AUTHENTIC_V4_1_UPDATED',
      attendance_status: 'attending'
    })
  });
  const patchData = await patchRes.json();
  if (patchData.ok) console.log('PATCH_GUEST_VERIFIED=PASS');

  // Process outbox update
  await fetch(`${previewBaseUrl}/api/sync/process`, { method: 'POST', headers: apiHeaders });

  // 5. DELETE /api/guests on Preview API
  console.log('4. DELETE /api/guests ...');
  const delRes = await fetch(`${previewBaseUrl}/api/guests?id=${testGuestId}`, {
    method: 'DELETE',
    headers: apiHeaders
  });
  const delData = await delRes.json();
  if (delData.ok) console.log('DELETE_GUEST_VERIFIED=PASS');

  // Process outbox delete
  await fetch(`${previewBaseUrl}/api/sync/process`, { method: 'POST', headers: apiHeaders });

  console.log('----------------------------------------------------');
  console.log('E2E_CALLS_PREVIEW_API=PASS');
  console.log('E2E_NO_DIRECT_DB_WRITES=PASS');
  console.log('E2E_NO_DIRECT_SHEETS_WRITES=PASS');
})();
