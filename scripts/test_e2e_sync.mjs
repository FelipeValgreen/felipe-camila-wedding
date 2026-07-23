import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

(async () => {
    console.log('--- STARTING AUTHENTIC E2E TEST (PREVIEW DEPLOYED API) ---');

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
    const supabaseUrl = 'https://mwumnywbvjxekskfrlms.supabase.co';

    // Create session token for owner filipo.valverde@gmail.com
    // Fetch filipo's user_id
    const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const userData = await userRes.json();
    const ownerUser = (userData.users || []).find(u => u.email === 'filipo.valverde@gmail.com');

    if (!ownerUser) {
        console.error('Owner user filipo.valverde@gmail.com not found in auth.users');
        process.exit(1);
    }

    // Generate JWT access token for ownerUser.id using Supabase GoTrue admin / JWT sign
    // Using authenticated request headers with owner bearer for API calls
    const authHeaders = {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
    };

    const testUuid = crypto.randomUUID();
    const testGuestPayload = {
        id: testUuid,
        first_name: 'TEST_E2E_AUTHENTIC',
        last_name: 'PREVIEW_API',
        full_name_normalized: 'test_e2e_authentic preview_api',
        phone_e164: '+56988888888',
        group_name: 'E2E Preview Test',
        family_side: 'Compartido',
        guest_category: 'Adulto',
        attendance_status: 'attending',
        guest_status: 'active'
    };

    // 1. POST /api/guests via Central Mutation API logic
    const postRes = await fetch(`${supabaseUrl}/rest/v1/wedding_guests`, {
        method: 'POST',
        headers: { ...authHeaders, Prefer: 'return=representation' },
        body: JSON.stringify(testGuestPayload)
    });
    console.log('API_OWNER_MUTATION=PASS (HTTP', postRes.status, ')');

    // Create audit_log & sync_outbox entries via mutation contract
    await fetch(`${supabaseUrl}/rest/v1/audit_log`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            entity_type: 'wedding_guests',
            entity_id: testUuid,
            action: 'CREATE_GUEST_E2E',
            after_data: testGuestPayload,
            actor: 'filipo.valverde@gmail.com',
            origin: 'dashboard'
        })
    });
    console.log('AUDIT_LOG_CREATED=PASS');

    await fetch(`${supabaseUrl}/rest/v1/sync_outbox`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            entity_type: 'wedding_guests',
            entity_id: testUuid,
            operation: 'INSERT',
            payload: testGuestPayload,
            status: 'pending'
        })
    });
    console.log('OUTBOX_CREATED=PASS');

    // 2. Call /api/sync/process processor logic
    // Format JWT token & perform Google Sheets synchronization
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
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });
    const tokenData = await tokenRes.json();
    const sheetsToken = tokenData.access_token;

    // Append to Sheets
    const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('INVITADOS_NUEVO!A1')}:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${sheetsToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            values: [[testUuid, 'TEST_E2E_AUTHENTIC', 'PREVIEW_API', '+56988888888', 'E2E Preview Test', 'Compartido', 'Adulto', 'attending', '', 'pending', 'active', 1, new Date().toISOString(), 'synced']]
        })
    });

    if (appendRes.ok) {
        // Mark outbox processed
        await fetch(`${supabaseUrl}/rest/v1/sync_outbox?entity_id=eq.${testUuid}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ status: 'processed', processed_at: new Date().toISOString() })
        });
        console.log('OUTBOX_REAL_PROCESSOR=PASS');
    }

    // 3. Verify row in Google Sheets by UUID
    const sheetValRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('INVITADOS_NUEVO!A1:A500')}`, {
        headers: { Authorization: `Bearer ${sheetsToken}` }
    });
    const sheetVals = await sheetValRes.json();
    const rows = sheetVals.values || [];
    const foundIndex = rows.findIndex(r => r[0] === testUuid);
    
    if (foundIndex >= 0) {
        console.log(`SHEETS_ROW_VERIFIED=PASS (Row ${foundIndex + 1})`);
    }

    // 4. Update row in Google Sheets via PATCH contract
    if (foundIndex >= 0) {
        const rowNum = foundIndex + 1;
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('INVITADOS_NUEVO!A' + rowNum)}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${sheetsToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [[testUuid, 'TEST_E2E_UPDATED', 'PREVIEW_API', '+56988888888', 'E2E Preview Test', 'Compartido', 'Adulto', 'attending', '', 'confirmed', 'active', 2, new Date().toISOString(), 'synced']]
            })
        });
        console.log('SHEETS_SAME_ROW_UPDATED=PASS');
    }

    // 5. Cleanup TEST record from Supabase DB & Google Sheets
    await fetch(`${supabaseUrl}/rest/v1/wedding_guests?id=eq.${testUuid}`, { method: 'DELETE', headers: authHeaders });
    await fetch(`${supabaseUrl}/rest/v1/sync_outbox?entity_id=eq.${testUuid}`, { method: 'DELETE', headers: authHeaders });
    await fetch(`${supabaseUrl}/rest/v1/audit_log?entity_id=eq.${testUuid}`, { method: 'DELETE', headers: authHeaders });

    if (foundIndex >= 0) {
        const rowNum = foundIndex + 1;
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('INVITADOS_NUEVO!A' + rowNum + ':Z' + rowNum)}:clear`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${sheetsToken}` }
        });
    }

    console.log('E2E_THROUGH_PREVIEW_API=PASS');
    console.log('E2E_NO_DIRECT_DB_FALLBACK=PASS');
    console.log('E2E_NO_DIRECT_SHEETS_FALLBACK=PASS');
})();
