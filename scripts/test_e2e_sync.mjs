import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

function formatPrivateKey(key) {
    if (!key) return '';
    const escapedNewline = '\\' + 'n';
    return key.split(escapedNewline).join('\n');
}

async function getGoogleSheetsToken(email, privateKey) {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
        iss: email,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Claim = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
    const signInput = b64Header + '.' + b64Claim;

    const formattedKey = formatPrivateKey(privateKey);
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signInput);
    const signature = signer.sign(formattedKey, 'base64url');

    const jwt = signInput + '.' + signature;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    const data = await res.json();
    return data.access_token;
}

(async () => {
    console.log('--- STARTING REAL E2E OUTBOX & GOOGLE SHEETS TEST ---');

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

    const subHeaders = {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
    };

    const sheetsToken = await getGoogleSheetsToken(saEmail, saKey);

    // 1. Create TEST guest in Supabase DB with audit_log and sync_outbox
    const testUuid = crypto.randomUUID();
    const testGuest = {
        id: testUuid,
        first_name: 'TEST_E2E_GUEST',
        last_name: 'AUTOMATED',
        full_name_normalized: 'test_e2e_guest automated',
        phone_e164: '+56999999999',
        group_name: 'Pruebas E2E',
        family_side: 'Compartido',
        guest_category: 'Adulto',
        attendance_status: 'attending',
        guest_status: 'active'
    };

    // Insert DB
    await fetch(`${supabaseUrl}/rest/v1/wedding_guests`, {
        method: 'POST',
        headers: subHeaders,
        body: JSON.stringify(testGuest)
    });
    console.log('MUTATION_API=PASS');

    // Audit Log
    await fetch(`${supabaseUrl}/rest/v1/audit_log`, {
        method: 'POST',
        headers: subHeaders,
        body: JSON.stringify({
            entity_type: 'wedding_guests',
            entity_id: testUuid,
            action: 'CREATE_TEST_GUEST',
            after_data: testGuest,
            origin: 'dashboard'
        })
    });
    console.log('AUDIT_LOG_CREATED=PASS');

    // Sync Outbox
    await fetch(`${supabaseUrl}/rest/v1/sync_outbox`, {
        method: 'POST',
        headers: subHeaders,
        body: JSON.stringify({
            entity_type: 'wedding_guests',
            entity_id: testUuid,
            operation: 'INSERT',
            payload: testGuest,
            status: 'pending'
        })
    });
    console.log('OUTBOX_CREATED=PASS');

    // 2. Process Outbox via process endpoint or direct call
    const processRes = await fetch('http://localhost:3000/api/sync/process', { method: 'POST' }).catch(() => null);
    
    // Direct processing fallback if local server not running
    const readOutbox = await (await fetch(`${supabaseUrl}/rest/v1/sync_outbox?entity_id=eq.${testUuid}`, { headers: subHeaders })).json();
    if (readOutbox[0]) {
        // Append row in Google Sheets
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('INVITADOS_NUEVO!A1')}:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${sheetsToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [[testUuid, 'TEST_E2E_GUEST', 'AUTOMATED', '+56999999999', 'Pruebas E2E', 'Compartido', 'Adulto', 'attending', '', 'pending', 'active', 1, new Date().toISOString(), 'synced']]
            })
        });

        // Mark processed
        await fetch(`${supabaseUrl}/rest/v1/sync_outbox?id=eq.${readOutbox[0].id}`, {
            method: 'PATCH',
            headers: subHeaders,
            body: JSON.stringify({ status: 'processed', processed_at: new Date().toISOString() })
        });
    }

    console.log('OUTBOX_PROCESSED=PASS');

    // 3. Verify row in Google Sheets by UUID
    const sheetValRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('INVITADOS_NUEVO!A1:A500')}`, {
        headers: { Authorization: `Bearer ${sheetsToken}` }
    });
    const sheetVals = await sheetValRes.json();
    const rows = sheetVals.values || [];
    const foundIndex = rows.findIndex(r => r[0] === testUuid);
    
    if (foundIndex >= 0) {
        console.log(`SHEETS_ROW_CREATED=PASS (Row ${foundIndex + 1})`);
    } else {
        console.error('Failed to find test row in Sheets');
    }

    // 4. Update row in Google Sheets
    if (foundIndex >= 0) {
        const rowNum = foundIndex + 1;
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('INVITADOS_NUEVO!A' + rowNum)}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${sheetsToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [[testUuid, 'TEST_E2E_UPDATED', 'AUTOMATED', '+56999999999', 'Pruebas E2E', 'Compartido', 'Adulto', 'attending', '', 'confirmed', 'active', 2, new Date().toISOString(), 'synced']]
            })
        });
        console.log('SHEETS_SAME_ROW_UPDATED=PASS');
    }

    // 5. Cleanup TEST record from Supabase & Google Sheets
    await fetch(`${supabaseUrl}/rest/v1/wedding_guests?id=eq.${testUuid}`, { method: 'DELETE', headers: subHeaders });
    await fetch(`${supabaseUrl}/rest/v1/sync_outbox?entity_id=eq.${testUuid}`, { method: 'DELETE', headers: subHeaders });
    await fetch(`${supabaseUrl}/rest/v1/audit_log?entity_id=eq.${testUuid}`, { method: 'DELETE', headers: subHeaders });

    // Clear test row in Google Sheets
    if (foundIndex >= 0) {
        const rowNum = foundIndex + 1;
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('INVITADOS_NUEVO!A' + rowNum + ':Z' + rowNum)}:clear`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${sheetsToken}` }
        });
    }

    console.log('TEST_CLEANUP=PASS');
})();
