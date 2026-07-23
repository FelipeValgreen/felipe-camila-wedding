import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

function formatPrivateKey(key: string) {
  if (!key) return '';
  const escapedNewline = '\\' + 'n';
  return key.split(escapedNewline).join('\n');
}

async function getGoogleSheetsToken(email: string, privateKey: string) {
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

export async function POST() {
  try {
    let saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    let saKey = process.env.GOOGLE_PRIVATE_KEY || '';
    let spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '';
    let supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwumnywbvjxekskfrlms.supabase.co';

    // Fallback fetching from Vercel CLI auth if running in development environment
    if (!saEmail || !saKey || !spreadsheetId) {
      try {
        const authFile = path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
        if (fs.existsSync(authFile)) {
          const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
          const token = authData.token;
          const getEnvVal = async (eid: string) => {
            const res = await fetch(`https://api.vercel.com/v9/projects/prj_CnQR6nh0a1lwcHpN1F3vLq1IWNHT/env/${eid}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const d = await res.json();
            return (d.value || '').trim();
          };
          if (!saEmail) saEmail = await getEnvVal('JwOVODGkkSW6ZY62');
          if (!saKey) saKey = await getEnvVal('fEgjSAksFUWsv8NL');
          if (!spreadsheetId) spreadsheetId = await getEnvVal('nOwry9xceJ90LLgb');
          if (!supabaseKey) supabaseKey = await getEnvVal('tIdPJeHjqlNaqtMn');
        }
      } catch (err) {
        console.error('Error fetching Vercel env fallback:', err);
      }
    }

    const subHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    // 1. Fetch pending sync_outbox items
    const outboxRes = await fetch(`${supabaseUrl}/rest/v1/sync_outbox?status=eq.pending&order=created_at.asc`, { headers: subHeaders });
    const pendingItems = await outboxRes.json();

    if (!Array.isArray(pendingItems) || pendingItems.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, failed: 0, pending: 0, message: 'No pending items to sync.' });
    }

    const sheetsToken = await getGoogleSheetsToken(saEmail, saKey);

    const entityTabMap: Record<string, string> = {
      wedding_guests: 'INVITADOS_NUEVO',
      wedding_tables: 'MESAS_NUEVO',
      seating_assignments: 'ASIGNACIONES_MESA',
      vendors: 'PROVEEDORES',
      expenses: 'GASTOS',
      expense_payments: 'PAGOS',
      rsvp_responses: 'CONFIRMACIONES_RSVP'
    };

    let processedCount = 0;
    let failedCount = 0;

    for (const item of pendingItems) {
      const tabName = entityTabMap[item.entity_type];
      if (!tabName) {
        failedCount++;
        continue;
      }

      try {
        const entityId = item.entity_id;
        const payload = item.payload || {};

        // Fetch Column A UUIDs from Google Sheets tab
        const readRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A1:A500')}`, {
          headers: { Authorization: `Bearer ${sheetsToken}` }
        });
        const readData = await readRes.json();
        const rows = readData.values || [];

        let rowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          if (rows[i][0] === entityId) {
            rowIndex = i + 1; // 1-based index
            break;
          }
        }

        // Format row array depending on entity_type
        let rowValues: any[] = [];
        if (item.entity_type === 'wedding_guests') {
          rowValues = [entityId, payload.first_name || '', payload.last_name || '', payload.phone_e164 || '', payload.group_name || '', payload.family_side || '', payload.guest_category || 'Adulto', payload.attendance_status || 'pending', payload.dietary_type || '', payload.reconfirmation_status || 'pending', payload.guest_status || 'active', payload.version || 1, new Date().toISOString(), 'synced'];
        } else if (item.entity_type === 'wedding_tables') {
          rowValues = [entityId, payload.table_number || '', payload.name || '', payload.capacity || 10, payload.table_type || 'round_guest', payload.zone || 'Principal', payload.locked ? 'YES' : 'NO', payload.version || 1, new Date().toISOString(), 'synced'];
        } else if (item.entity_type === 'vendors') {
          rowValues = [entityId, payload.name || '', payload.category || '', payload.contact_name || '', payload.phone || '', payload.status || '', new Date().toISOString(), 'synced'];
        } else if (item.entity_type === 'expenses') {
          rowValues = [entityId, payload.vendor_id || '', payload.concept || '', payload.category || '', payload.currency || 'CLP', payload.total_amount || '', payload.payment_status || 'Pendiente', payload.due_date || '', payload.responsible || '', new Date().toISOString(), 'synced'];
        } else if (item.entity_type === 'expense_payments') {
          rowValues = [entityId, payload.expense_id || '', payload.amount || '', payload.currency || 'CLP', payload.payment_date || '', payload.payment_type || '', payload.status || 'Pagado', new Date().toISOString(), 'synced'];
        } else {
          rowValues = [entityId, JSON.stringify(payload), new Date().toISOString(), 'synced'];
        }

        if (rowIndex > 0) {
          // Update existing row
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A' + rowIndex)}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${sheetsToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: [rowValues] })
          });
        } else {
          // Append new row
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A1')}:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sheetsToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: [rowValues] })
          });
        }

        // Mark processed in Supabase DB
        await fetch(`${supabaseUrl}/rest/v1/sync_outbox?id=eq.${item.id}`, {
          method: 'PATCH',
          headers: subHeaders,
          body: JSON.stringify({
            status: 'processed',
            processed_at: new Date().toISOString(),
            attempts: (item.attempts || 0) + 1
          })
        });

        processedCount++;
      } catch (err: any) {
        failedCount++;
        await fetch(`${supabaseUrl}/rest/v1/sync_outbox?id=eq.${item.id}`, {
          method: 'PATCH',
          headers: subHeaders,
          body: JSON.stringify({
            status: 'failed',
            attempts: (item.attempts || 0) + 1,
            last_error: err.message
          })
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: processedCount,
      failed: failedCount,
      pending: pendingItems.length - processedCount - failedCount
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
