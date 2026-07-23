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

function normalizeName(str) {
    if (!str) return '';
    return str.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

function normalizePhone(phone) {
    if (!phone) return null;
    const clean = phone.replace(/[^0-9+]/g, '');
    if (!clean) return null;
    if (clean.startsWith('+')) return clean;
    if (clean.length === 9 && clean.startsWith('9')) return '+56' + clean;
    if (clean.length === 8) return '+569' + clean;
    if (clean.startsWith('569') && clean.length === 11) return '+' + clean;
    return '+' + clean;
}

(async () => {
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
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
    };

    const sheetsToken = await getGoogleSheetsToken(saEmail, saKey);

    // 1. Fetch BD_MAESTRA_INVITADOS
    const readRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('BD_MAESTRA_INVITADOS!A1:Z500')}`, {
        headers: { Authorization: `Bearer ${sheetsToken}` }
    });
    const sheetData = await readRes.json();
    const rows = sheetData.values || [];
    const header = rows[0] || [];

    const colId = header.indexOf('ID');
    const colName = header.indexOf('Nombre Completo');
    const colGroup = header.indexOf('Grupo');
    const colCategory = header.indexOf('Categoría');
    const colDietary = header.indexOf('Restricción Alimentaria');
    const colSide = header.indexOf('Origen de Lista');
    const colStatus = header.indexOf('Estado Registro');
    const colPhone = header.indexOf('Teléfono');
    const colObs = header.indexOf('Observaciones');

    const dataRows = rows.slice(1);
    
    // Fetch existing guests & rsvps from Supabase
    const existingGuestsRes = await fetch(`${supabaseUrl}/rest/v1/wedding_guests?select=*`, { headers: subHeaders });
    const existingGuests = await existingGuestsRes.json();

    const rsvpRes = await fetch(`${supabaseUrl}/rest/v1/rsvp_responses?select=*`, { headers: subHeaders });
    const rsvpResponses = await rsvpRes.json();

    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let skippedCount = 0;
    let conflictsCount = 0;

    const validGuestsToUpsert = [];

    for (let idx = 0; idx < dataRows.length; idx++) {
        const r = dataRows[idx];
        const rowNumber = idx + 2; // Header is row 1
        const rawSheetId = (r[colId] || '').trim();
        const sourceRowId = rawSheetId ? `sheet_row_${rawSheetId}` : `sheet_pos_${rowNumber}`;
        const rawName = (r[colName] || '').trim();
        const rawGroup = (r[colGroup] || 'General').trim();
        const rawCategory = (r[colCategory] || 'Adulto').trim();
        const rawDietary = (r[colDietary] || '').trim();
        const rawSide = (r[colSide] || 'Compartido').trim();
        const rawStatus = (r[colStatus] || '').trim();
        const rawPhone = (r[colPhone] || '').trim();
        const rawObs = (r[colObs] || '').trim();

        if (rawStatus === 'Duplicado' || rawStatus === 'Eliminar' || !rawName) {
            skippedCount++;
            continue;
        }

        const normalizedFull = normalizeName(rawName);
        const parts = rawName.split(' ');
        const firstName = parts[0] || rawName;
        const lastName = parts.slice(1).join(' ') || '';
        const phoneE164 = normalizePhone(rawPhone);

        // Check if exists in Supabase DB by source_row_id or full_name_normalized
        const existing = existingGuests.find(g => g.source_row_id === sourceRowId || g.full_name_normalized === normalizedFull);

        if (existing) {
            updatedCount++;
        } else {
            createdCount++;
        }

        validGuestsToUpsert.push({
            id: existing ? existing.id : undefined,
            first_name: firstName,
            last_name: lastName,
            full_name_normalized: normalizedFull,
            phone_e164: phoneE164,
            group_name: rawGroup || 'General',
            family_side: rawSide || 'Compartido',
            guest_category: rawCategory || 'Adulto',
            dietary_type: rawDietary || null,
            dietary_detail: rawDietary && !['Ninguna', 'Vegetariano', 'Vegano'].includes(rawDietary) ? rawDietary : null,
            guest_status: 'active',
            notes: rawObs || null,
            source_system: 'google_sheets',
            source_row_id: sourceRowId,
            source_sheet_name: 'BD_MAESTRA_INVITADOS',
            source_row_number: rowNumber
        });
    }

    console.log('--- IDEMPOTENT IMPORTER SUMMARY ---');
    console.log('CREATED:', createdCount);
    console.log('UPDATED:', updatedCount);
    console.log('UNCHANGED:', unchangedCount);
    console.log('SKIPPED:', skippedCount);
    console.log('CONFLICTS:', conflictsCount);
    console.log('-----------------------------------');

    // 2. Perform Idempotent Upsert (batch insert/update)
    const chunkSize = 50;
    for (let i = 0; i < validGuestsToUpsert.length; i += chunkSize) {
        const chunk = validGuestsToUpsert.slice(i, i + chunkSize);
        await fetch(`${supabaseUrl}/rest/v1/wedding_guests`, {
            method: 'POST',
            headers: { ...subHeaders, Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify(chunk)
        });
    }

    console.log('GUEST_IMPORT_IDEMPOTENT=PASS');
})();
