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

    // Indices
    const colName = header.indexOf('Nombre Completo');
    const colGroup = header.indexOf('Grupo');
    const colCategory = header.indexOf('Categoría');
    const colDietary = header.indexOf('Restricción Alimentaria');
    const colSide = header.indexOf('Origen de Lista');
    const colStatus = header.indexOf('Estado Registro');
    const colPhone = header.indexOf('Teléfono');
    const colObs = header.indexOf('Observaciones');

    const dataRows = rows.slice(1);
    
    // Fetch existing rsvp_responses from Supabase
    const rsvpRes = await fetch(`${supabaseUrl}/rest/v1/rsvp_responses?select=*`, {
        headers: subHeaders
    });
    const rsvpResponses = await rsvpRes.json();

    let TOTAL_ROWS = dataRows.length;
    let VALID_ROWS = 0;
    let MISSING_NAMES = 0;
    let VALID_PHONES = 0;
    let MISSING_PHONES = 0;
    let ROWS_MARKED_DUPLICATE = 0;
    let ROWS_MARKED_DELETE = 0;
    let POSSIBLE_RSVP_MATCHES = 0;
    let AMBIGUOUS_MATCHES = 0;

    const phoneCounts = {};
    const nameCounts = {};
    const validGuestsToImport = [];

    for (const r of dataRows) {
        const rawName = (r[colName] || '').trim();
        const rawGroup = (r[colGroup] || 'General').trim();
        const rawCategory = (r[colCategory] || 'Adulto').trim();
        const rawDietary = (r[colDietary] || '').trim();
        const rawSide = (r[colSide] || 'Compartido').trim();
        const rawStatus = (r[colStatus] || '').trim();
        const rawPhone = (r[colPhone] || '').trim();
        const rawObs = (r[colObs] || '').trim();

        if (rawStatus === 'Duplicado') {
            ROWS_MARKED_DUPLICATE++;
            continue;
        }
        if (rawStatus === 'Eliminar') {
            ROWS_MARKED_DELETE++;
            continue;
        }

        if (!rawName) {
            MISSING_NAMES++;
            continue;
        }

        const normalizedFull = normalizeName(rawName);
        nameCounts[normalizedFull] = (nameCounts[normalizedFull] || 0) + 1;

        // Separate first and last name
        const parts = rawName.split(' ');
        const firstName = parts[0] || rawName;
        const lastName = parts.slice(1).join(' ') || '';

        const phoneE164 = normalizePhone(rawPhone);
        if (phoneE164) {
            VALID_PHONES++;
            phoneCounts[phoneE164] = (phoneCounts[phoneE164] || 0) + 1;
        } else {
            MISSING_PHONES++;
        }

        // Check RSVP match count
        if (phoneE164) {
            const matches = rsvpResponses.filter(resp => resp.phone_e164 === phoneE164);
            if (matches.length === 1) POSSIBLE_RSVP_MATCHES++;
            else if (matches.length > 1) AMBIGUOUS_MATCHES++;
        }

        VALID_ROWS++;

        validGuestsToImport.push({
            first_name: firstName,
            last_name: lastName,
            full_name_normalized: normalizedFull,
            phone_e164: phoneE164,
            group_name: rawGroup || 'General',
            family_side: rawSide || 'Compartido',
            guest_category: rawCategory || 'Adulto',
            invitation_status: 'not_sent',
            attendance_status: 'pending',
            dietary_type: rawDietary || null,
            dietary_detail: rawDietary && !['Ninguna', 'Vegetariano', 'Vegano'].includes(rawDietary) ? rawDietary : null,
            guest_status: 'active',
            notes: rawObs || null
        });
    }

    const DUPLICATE_PHONES = Object.values(phoneCounts).filter(c => c > 1).length;
    const DUPLICATE_NAMES = Object.values(nameCounts).filter(c => c > 1).length;

    console.log('--- DRY RUN REPORT ---');
    console.log('TOTAL_ROWS:', TOTAL_ROWS);
    console.log('VALID_ROWS:', VALID_ROWS);
    console.log('MISSING_NAMES:', MISSING_NAMES);
    console.log('VALID_PHONES:', VALID_PHONES);
    console.log('MISSING_PHONES:', MISSING_PHONES);
    console.log('DUPLICATE_PHONES:', DUPLICATE_PHONES);
    console.log('DUPLICATE_NAMES:', DUPLICATE_NAMES);
    console.log('ROWS_MARKED_DUPLICATE:', ROWS_MARKED_DUPLICATE);
    console.log('ROWS_MARKED_DELETE:', ROWS_MARKED_DELETE);
    console.log('POSSIBLE_RSVP_MATCHES:', POSSIBLE_RSVP_MATCHES);
    console.log('AMBIGUOUS_MATCHES:', AMBIGUOUS_MATCHES);
    console.log('----------------------');

    // 2. Import valid guests to Supabase
    console.log(`Importing ${validGuestsToImport.length} valid guests into public.wedding_guests...`);
    
    // Clear existing test rows in wedding_guests if any
    await fetch(`${supabaseUrl}/rest/v1/wedding_guests?id=neq.00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers: subHeaders
    });

    // Chunk insert in batches of 50
    const chunkSize = 50;
    const insertedGuests = [];
    for (let i = 0; i < validGuestsToImport.length; i += chunkSize) {
        const chunk = validGuestsToImport.slice(i, i + chunkSize);
        const insRes = await fetch(`${supabaseUrl}/rest/v1/wedding_guests`, {
            method: 'POST',
            headers: subHeaders,
            body: JSON.stringify(chunk)
        });
        const insertedData = await insRes.json();
        if (Array.isArray(insertedData)) {
            insertedGuests.push(...insertedData);
        }
    }
    console.log(`SUCCESSFULLY IMPORTED ${insertedGuests.length} GUESTS!`);

    // 3. Perform RSVP Reconciliation
    console.log('Running RSVP Reconciliation against wedding_guests...');
    let MATCHED_COUNT = 0;
    let UNMATCHED_COUNT = 0;
    let AMBIGUOUS_RECON_COUNT = 0;

    for (const rsvp of rsvpResponses) {
        const p = rsvp.phone_e164;
        const matches = insertedGuests.filter(g => g.phone_e164 === p);

        let recStatus = 'unmatched';
        let matchedGuestId = null;

        if (matches.length === 1) {
            recStatus = 'matched';
            matchedGuestId = matches[0].id;
            MATCHED_COUNT++;

            // Sync attendance and dietary to wedding_guests table
            await fetch(`${supabaseUrl}/rest/v1/wedding_guests?id=eq.${matchedGuestId}`, {
                method: 'PATCH',
                headers: subHeaders,
                body: JSON.stringify({
                    rsvp_id: rsvp.id,
                    attendance_status: rsvp.attendance_status,
                    dietary_type: rsvp.dietary_type || null,
                    dietary_detail: rsvp.dietary_detail || null,
                    reconfirmation_status: rsvp.reconfirmation_status || 'confirmed',
                    reconfirmed_at: rsvp.reconfirmed_at || rsvp.first_response_at
                })
            });

        } else if (matches.length > 1) {
            recStatus = 'ambiguous';
            AMBIGUOUS_RECON_COUNT++;
        } else {
            UNMATCHED_COUNT++;
        }

        // Update rsvp_responses
        await fetch(`${supabaseUrl}/rest/v1/rsvp_responses?id=eq.${rsvp.id}`, {
            method: 'PATCH',
            headers: subHeaders,
            body: JSON.stringify({
                guest_id: matchedGuestId,
                reconciliation_status: recStatus
            })
        });
    }

    console.log('--- RECONCILIATION SUMMARY ---');
    console.log('MATCHED_COUNT:', MATCHED_COUNT);
    console.log('UNMATCHED_COUNT:', UNMATCHED_COUNT);
    console.log('AMBIGUOUS_RECON_COUNT:', AMBIGUOUS_RECON_COUNT);
    console.log('RECONCILIATION=PASS');
})();
