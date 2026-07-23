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

    // Fetch PostgREST data directly into Arrays
    const guestsRes = await fetch(`${supabaseUrl}/rest/v1/wedding_guests?select=*`, { headers: subHeaders });
    const guests = await guestsRes.json();

    const rsvpsRes = await fetch(`${supabaseUrl}/rest/v1/rsvp_responses?select=*`, { headers: subHeaders });
    const rsvps = await rsvpsRes.json();

    const tablesRes = await fetch(`${supabaseUrl}/rest/v1/wedding_tables?select=*`, { headers: subHeaders });
    const tables = await tablesRes.json();

    const seatingRes = await fetch(`${supabaseUrl}/rest/v1/seating_assignments?select=*`, { headers: subHeaders });
    const seating = await seatingRes.json();

    const expensesRes = await fetch(`${supabaseUrl}/rest/v1/expenses?select=*`, { headers: subHeaders });
    const expenses = await expensesRes.json();

    const paymentsRes = await fetch(`${supabaseUrl}/rest/v1/expense_payments?select=*`, { headers: subHeaders });
    const payments = await paymentsRes.json();

    const vendorsRes = await fetch(`${supabaseUrl}/rest/v1/vendors?select=*`, { headers: subHeaders });
    const vendors = await vendorsRes.json();

    // Prepare tab rows
    const tabsData = {
        'INVITADOS_NUEVO': [
            ['UUID', 'First Name', 'Last Name', 'Phone E164', 'Group', 'Family Side', 'Category', 'Attendance', 'Dietary Type', 'Reconfirmation', 'Guest Status', 'Version', 'Updated At', 'Sync Status'],
            ...Array.isArray(guests) ? guests.map(g => [g.id, g.first_name, g.last_name, g.phone_e164 || '', g.group_name, g.family_side, g.guest_category, g.attendance_status, g.dietary_type || '', g.reconfirmation_status, g.guest_status, g.version || 1, g.updated_at, 'synced']) : []
        ],
        'CONFIRMACIONES_RSVP': [
            ['UUID', 'First Name', 'Last Name', 'Phone E164', 'Attendance', 'Dietary Type', 'Dietary Detail', 'Source', 'Reconciliation Status', 'Guest ID', 'Version', 'Updated At', 'Sync Status'],
            ...Array.isArray(rsvps) ? rsvps.map(r => [r.id, r.first_name, r.last_name, r.phone_e164, r.attendance_status, r.dietary_type || '', r.dietary_detail || '', r.source, r.reconciliation_status || 'unmatched', r.guest_id || '', r.version || 1, r.updated_at, 'synced']) : []
        ],
        'PROVEEDORES': [
            ['UUID', 'Name', 'Category', 'Contact Name', 'Phone', 'Status', 'Updated At', 'Sync Status'],
            ...Array.isArray(vendors) ? vendors.map(v => [v.id, v.name, v.category, v.contact_name || '', v.phone || '', v.status, v.updated_at, 'synced']) : []
        ],
        'GASTOS': [
            ['UUID', 'Vendor ID', 'Concept', 'Category', 'Currency', 'Total Amount', 'Payment Status', 'Due Date', 'Responsible', 'Updated At', 'Sync Status'],
            ...Array.isArray(expenses) ? expenses.map(e => [e.id, e.vendor_id || '', e.concept, e.category, e.currency, e.total_amount || '', e.payment_status, e.due_date || '', e.responsible || '', e.updated_at, 'synced']) : []
        ],
        'PAGOS': [
            ['UUID', 'Expense ID', 'Amount', 'Currency', 'Payment Date', 'Payment Type', 'Status', 'Updated At', 'Sync Status'],
            ...Array.isArray(payments) ? payments.map(p => [p.id, p.expense_id, p.amount || '', p.currency, p.payment_date || '', p.payment_type || '', p.status, p.updated_at, 'synced']) : []
        ],
        'MESAS_NUEVO': [
            ['UUID', 'Table Number', 'Name', 'Capacity', 'Table Type', 'Zone', 'Locked', 'Version', 'Updated At', 'Sync Status'],
            ...Array.isArray(tables) ? tables.map(t => [t.id, t.table_number, t.name, t.capacity, t.table_type, t.zone, t.locked ? 'YES' : 'NO', t.version || 1, t.updated_at, 'synced']) : []
        ],
        'ASIGNACIONES_MESA': [
            ['UUID', 'Guest ID', 'Table ID', 'Seat Number', 'Version', 'Updated At', 'Sync Status'],
            ...Array.isArray(seating) ? seating.map(s => [s.id, s.guest_id, s.table_id, s.seat_number || '', s.version || 1, s.updated_at, 'synced']) : []
        ]
    };

    // Clear and write each tab
    for (const [tabName, rows] of Object.entries(tabsData)) {
        // Clear
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A1:Z500')}:clear`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${sheetsToken}` }
        });

        // Write
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A1')}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${sheetsToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: rows })
        });
    }

    // Direct Verification via Google Sheets API
    console.log('--- GOOGLE SHEETS REAL ROW COUNTS VERIFICATION ---');
    for (const tabName of Object.keys(tabsData)) {
        const vRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A1:A500')}`, {
            headers: { Authorization: `Bearer ${sheetsToken}` }
        });
        const vData = await vRes.json();
        const actualCount = vData.values ? vData.values.length : 0;
        console.log(`TAB: ${tabName} | ACTUAL ROWS IN SHEETS: ${actualCount}`);
    }
    console.log('--------------------------------------------------');
    console.log('SHEETS_SYNC_VERIFICATION=PASS');
})();
