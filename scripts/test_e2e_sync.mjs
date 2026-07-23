import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

(async () => {
  console.log('--- STARTING AUTHENTIC E2E TEST CONTRA VERCEL PREVIEW (V4.2) ---');

  const baseUrl = (process.env.E2E_BASE_URL || '').trim();

  // Strict check on E2E_BASE_URL: must be Vercel HTTPS URL
  if (!baseUrl || !baseUrl.startsWith('https://') || !baseUrl.includes('.vercel.app')) {
    console.error('ERROR: E2E_BASE_URL must be a valid Vercel HTTPS URL (e.g. https://<preview-real>.vercel.app). Provided:', baseUrl);
    process.exit(1);
  }

  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    console.error('ERROR: Fallback to localhost or 127.0.0.1 is strictly prohibited.');
    process.exit(1);
  }

  const envPath = path.join(process.cwd(), 'gestion/.env.local');
  const envText = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  envText.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envVars[match[1].trim()] = val;
    }
  });

  const saEmail = envVars.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const saKey = envVars.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const spreadsheetId = envVars.GOOGLE_SHEETS_SPREADSHEET_ID;
  const supabaseKey = envVars.SUPABASE_SECRET_KEY;
  const supabasePublishableKey = envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || 'https://mwumnywbvjxekskfrlms.supabase.co';

  // 1. Authenticate owner user filipo.valverde@gmail.com
  const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type: 'magiclink', email: 'filipo.valverde@gmail.com' })
  });
  const linkData = await linkRes.json();
  const tokenHash = linkData.hashed_token;

  const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: supabasePublishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: tokenHash })
  });
  const sessionData = await verifyRes.json();
  const userAccessToken = sessionData.access_token;
  const userRefreshToken = sessionData.refresh_token;

  if (!userAccessToken) {
    console.error('Failed to obtain owner userAccessToken:', sessionData);
    process.exit(1);
  }

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
    first_name: 'E2E_V4_2_TEST',
    last_name: 'GUEST_VERCEL',
    full_name_normalized: 'e2e_v4_2_test guest_vercel',
    phone_e164: '+56988888888',
    group_name: 'E2E Validation Group V4.2',
    family_side: 'Compartido',
    guest_category: 'Adulto',
    attendance_status: 'attending',
    guest_status: 'active'
  };

  // 2. POST E2E_BASE_URL/api/guests
  const postRes = await fetch(`${baseUrl}/api/guests`, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify(testPayload)
  });
  const postData = await postRes.json();
  const postPass = (postRes.ok && postData.ok) ? 'PASS' : 'FAIL';
  if (postPass !== 'PASS') {
    console.error('POST /api/guests failed:', postData);
    process.exit(1);
  }

  // 3. Verify via read: guest, audit_log, sync_outbox pending
  const getGuestRes = await fetch(`${supabaseUrl}/rest/v1/wedding_guests?id=eq.${testGuestId}`, { headers: dbHeaders });
  const guestInDb = await getGuestRes.json();
  const auditPass = (guestInDb.length > 0) ? 'PASS' : 'FAIL';

  const getAuditRes = await fetch(`${supabaseUrl}/rest/v1/audit_log?entity_id=eq.${testGuestId}`, { headers: dbHeaders });
  const auditInDb = await getAuditRes.json();
  const auditLogPass = (auditInDb.length > 0) ? 'PASS' : 'FAIL';

  const getOutboxRes = await fetch(`${supabaseUrl}/rest/v1/sync_outbox?entity_id=eq.${testGuestId}&status=eq.pending`, { headers: dbHeaders });
  const outboxInDb = await getOutboxRes.json();
  const outboxPendingPass = (outboxInDb.length > 0) ? 'PASS' : 'FAIL';

  // Helper for Google Sheets API Token
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

  // 4. POST E2E_BASE_URL/api/sync/process
  const syncRes1 = await fetch(`${baseUrl}/api/sync/process`, { method: 'POST', headers: apiHeaders });
  const syncData1 = await syncRes1.json();
  const syncInsertPass = (syncRes1.ok && syncData1.processed >= 1) ? 'PASS' : 'FAIL';

  // 5. Verify row created in Sheets
  const sheetReadRes1 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('INVITADOS_NUEVO!A:A')}`, {
    headers: { Authorization: `Bearer ${sheetsToken}` }
  });
  const sheetVals1 = await sheetReadRes1.json();
  const rows1 = sheetVals1.values || [];
  const sheetRowIndex = rows1.findIndex(r => r[0] === testGuestId);
  const sheetRowNumber = sheetRowIndex >= 0 ? sheetRowIndex + 1 : null;
  const sheetRowCreatedPass = sheetRowNumber !== null ? 'PASS' : 'FAIL';

  // 6. PATCH E2E_BASE_URL/api/guests
  const patchRes = await fetch(`${baseUrl}/api/guests`, {
    method: 'PATCH',
    headers: apiHeaders,
    body: JSON.stringify({
      id: testGuestId,
      first_name: 'E2E_V4_2_UPDATED',
      attendance_status: 'attending'
    })
  });
  const patchData = await patchRes.json();
  const patchApiPass = (patchRes.ok && patchData.ok) ? 'PASS' : 'FAIL';

  // 7. Process outbox PATCH
  await fetch(`${baseUrl}/api/sync/process`, { method: 'POST', headers: apiHeaders });

  // 8. Verify update on same row in Sheets
  const sheetReadRes2 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`INVITADOS_NUEVO!A${sheetRowNumber}:B${sheetRowNumber}`)}`, {
    headers: { Authorization: `Bearer ${sheetsToken}` }
  });
  const sheetVals2 = await sheetReadRes2.json();
  const updatedRowData = sheetVals2.values ? sheetVals2.values[0] : [];
  const sameRowUpdatedPass = (updatedRowData[0] === testGuestId && updatedRowData[1] === 'E2E_V4_2_UPDATED') ? 'PASS' : 'FAIL';

  // 9. DELETE E2E_BASE_URL/api/guests
  const delRes = await fetch(`${baseUrl}/api/guests?id=${testGuestId}`, { method: 'DELETE', headers: apiHeaders });
  const delData = await delRes.json();
  const deleteApiPass = (delRes.ok && delData.ok) ? 'PASS' : 'FAIL';

  // 10. Process outbox DELETE
  await fetch(`${baseUrl}/api/sync/process`, { method: 'POST', headers: apiHeaders });

  // 11. Verify deletion & test cleanup
  const getGuestDelRes = await fetch(`${supabaseUrl}/rest/v1/wedding_guests?id=eq.${testGuestId}`, { headers: dbHeaders });
  const guestAfterDel = await getGuestDelRes.json();
  const dbDeletedPass = (guestAfterDel.length === 0 || guestAfterDel[0].guest_status === 'deleted') ? 'PASS' : 'FAIL';

  const sheetReadRes3 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`INVITADOS_NUEVO!A${sheetRowNumber}:A${sheetRowNumber}`)}`, {
    headers: { Authorization: `Bearer ${sheetsToken}` }
  });
  const sheetVals3 = await sheetReadRes3.json();
  const rowAfterDel = sheetVals3.values ? sheetVals3.values[0] : [];
  const sheetRowRemovedPass = (!rowAfterDel[0] || rowAfterDel[0] !== testGuestId) ? 'PASS' : 'FAIL';

  // Cleanup test outbox / audit records
  await fetch(`${supabaseUrl}/rest/v1/sync_outbox?entity_id=eq.${testGuestId}`, { method: 'DELETE', headers: dbHeaders });
  await fetch(`${supabaseUrl}/rest/v1/audit_log?entity_id=eq.${testGuestId}`, { method: 'DELETE', headers: dbHeaders });
  await fetch(`${supabaseUrl}/rest/v1/wedding_guests?id=eq.${testGuestId}`, { method: 'DELETE', headers: dbHeaders });

  const testCleanupPass = (dbDeletedPass === 'PASS' && sheetRowRemovedPass === 'PASS') ? 'PASS' : 'FAIL';

  console.log(`E2E_BASE_URL=${baseUrl}`);
  console.log(`TEST_UUID=${testGuestId}`);
  console.log(`SHEET_ROW=${sheetRowNumber}`);
  console.log(`POST_API=${postPass}`);
  console.log(`AUDIT_LOG=${auditLogPass}`);
  console.log(`OUTBOX_PENDING=${outboxPendingPass}`);
  console.log(`SYNC_INSERT=${syncInsertPass}`);
  console.log(`SHEET_ROW_CREATED=${sheetRowCreatedPass}`);
  console.log(`PATCH_API=${patchApiPass}`);
  console.log(`SAME_ROW_UPDATED=${sameRowUpdatedPass}`);
  console.log(`DELETE_API=${deleteApiPass}`);
  console.log(`SHEET_ROW_REMOVED=${sheetRowRemovedPass}`);
  console.log(`TEST_CLEANUP=${testCleanupPass}`);
})();
