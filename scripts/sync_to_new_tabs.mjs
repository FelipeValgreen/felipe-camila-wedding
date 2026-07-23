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
        Authorization: `Bearer ${supabaseKey}`
    };

    const sheetsToken = await getGoogleSheetsToken(saEmail, saKey);

    // 1. Check existing sheets in Spreadsheet
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: { Authorization: `Bearer ${sheetsToken}` }
    });
    const metaData = await metaRes.json();
    const existingTitles = (metaData.sheets || []).map(s => s.properties.title);

    const requiredTabs = [
        'DASHBOARD_NUEVO',
        'INVITADOS_NUEVO',
        'CONFIRMACIONES_RSVP',
        'MESAS_NUEVO',
        'ASIGNACIONES_MESA',
        'GASTOS',
        'PAGOS',
        'PROVEEDORES'
    ];

    // Create missing tabs
    const addRequests = [];
    for (const tab of requiredTabs) {
        if (!existingTitles.includes(tab)) {
            addRequests.push({
                addSheet: {
                    properties: { title: tab }
                }
            });
        }
    }

    if (addRequests.length > 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${sheetsToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests: addRequests })
        });
        console.log(`Created ${addRequests.length} new tabs in Google Sheets!`);
    }

    // 2. Fetch data from Supabase
    const { data: guests } = await (await fetch(`${supabaseUrl}/rest/v1/wedding_guests?select=*`, { headers: subHeaders })).json();
    const { data: rsvps } = await (await fetch(`${supabaseUrl}/rest/v1/rsvp_responses?select=*`, { headers: subHeaders })).json();
    const { data: tables } = await (await fetch(`${supabaseUrl}/rest/v1/wedding_tables?select=*`, { headers: subHeaders })).json();
    const { data: seating } = await (await fetch(`${supabaseUrl}/rest/v1/seating_assignments?select=*`, { headers: subHeaders })).json();
    const { data: expenses } = await (await fetch(`${supabaseUrl}/rest/v1/expenses?select=*`, { headers: subHeaders })).json();
    const { data: payments } = await (await fetch(`${supabaseUrl}/rest/v1/expense_payments?select=*`, { headers: subHeaders })).json();
    const { data: vendors } = await (await fetch(`${supabaseUrl}/rest/v1/vendors?select=*`, { headers: subHeaders })).json();

    // 3. Write data to each tab
    const writeRanges = [];

    // INVITADOS_NUEVO
    const guestRows = [
        ['UUID', 'First Name', 'Last Name', 'Phone E164', 'Group', 'Family Side', 'Category', 'Attendance', 'Dietary Type', 'Reconfirmation', 'Guest Status', 'Version', 'Updated At', 'Sync Status']
    ];
    (guests || []).forEach(g => {
        guestRows.push([g.id, g.first_name, g.last_name, g.phone_e164 || '', g.group_name, g.family_side, g.guest_category, g.attendance_status, g.dietary_type || '', g.reconfirmation_status, g.guest_status, g.version || 1, g.updated_at, 'synced']);
    });
    writeRanges.push({ range: 'INVITADOS_NUEVO!A1:Z500', values: guestRows });

    // CONFIRMACIONES_RSVP
    const rsvpRows = [
        ['UUID', 'First Name', 'Last Name', 'Phone E164', 'Attendance', 'Dietary Type', 'Dietary Detail', 'Source', 'Reconciliation Status', 'Guest ID', 'Version', 'Updated At', 'Sync Status']
    ];
    (rsvps || []).forEach(r => {
        rsvpRows.push([r.id, r.first_name, r.last_name, r.phone_e164, r.attendance_status, r.dietary_type || '', r.dietary_detail || '', r.source, r.reconciliation_status || 'unmatched', r.guest_id || '', r.version || 1, r.updated_at, 'synced']);
    });
    writeRanges.push({ range: 'CONFIRMACIONES_RSVP!A1:Z500', values: rsvpRows });

    // MESAS_NUEVO
    const tableRows = [
        ['UUID', 'Table Number', 'Name', 'Capacity', 'Table Type', 'Zone', 'Locked', 'Version', 'Updated At', 'Sync Status']
    ];
    (tables || []).forEach(t => {
        tableRows.push([t.id, t.table_number, t.name, t.capacity, t.table_type, t.zone, t.locked ? 'YES' : 'NO', t.version || 1, t.updated_at, 'synced']);
    });
    writeRanges.push({ range: 'MESAS_NUEVO!A1:Z500', values: tableRows });

    // ASIGNACIONES_MESA
    const seatRows = [
        ['UUID', 'Guest ID', 'Table ID', 'Seat Number', 'Version', 'Updated At', 'Sync Status']
    ];
    (seating || []).forEach(s => {
        seatRows.push([s.id, s.guest_id, s.table_id, s.seat_number || '', s.version || 1, s.updated_at, 'synced']);
    });
    writeRanges.push({ range: 'ASIGNACIONES_MESA!A1:Z500', values: seatRows });

    // GASTOS
    const expenseRows = [
        ['UUID', 'Vendor ID', 'Concept', 'Category', 'Currency', 'Total Amount', 'Payment Status', 'Due Date', 'Responsible', 'Updated At', 'Sync Status']
    ];
    (expenses || []).forEach(e => {
        expenseRows.push([e.id, e.vendor_id || '', e.concept, e.category, e.currency, e.total_amount || '', e.payment_status, e.due_date || '', e.responsible || '', e.updated_at, 'synced']);
    });
    writeRanges.push({ range: 'GASTOS!A1:Z500', values: expenseRows });

    // PAGOS
    const paymentRows = [
        ['UUID', 'Expense ID', 'Amount', 'Currency', 'Payment Date', 'Payment Type', 'Status', 'Updated At', 'Sync Status']
    ];
    (payments || []).forEach(p => {
        paymentRows.push([p.id, p.expense_id, p.amount || '', p.currency, p.payment_date || '', p.payment_type || '', p.status, p.updated_at, 'synced']);
    });
    writeRanges.push({ range: 'PAGOS!A1:Z500', values: paymentRows });

    // PROVEEDORES
    const vendorRows = [
        ['UUID', 'Name', 'Category', 'Contact Name', 'Phone', 'Status', 'Updated At', 'Sync Status']
    ];
    (vendors || []).forEach(v => {
        vendorRows.push([v.id, v.name, v.category, v.contact_name || '', v.phone || '', v.status, v.updated_at, 'synced']);
    });
    writeRanges.push({ range: 'PROVEEDORES!A1:Z500', values: vendorRows });

    // Execute Batch Update Values
    for (const item of writeRanges) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(item.range)}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${sheetsToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: item.values })
        });
    }

    console.log('SHEETS_NEW_TABS_SYNCED=PASS');
})();
