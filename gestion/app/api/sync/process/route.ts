import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

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

  if (!res.ok) {
    throw new Error(`Google OAuth token retrieval failed with status ${res.status}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Google OAuth token response missing access_token');
  }

  return data.access_token;
}

export async function POST() {
  try {
    const supabase = createClient();
    
    // Authenticate owner or editor session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
    if (!profile || !profile.active || profile.role === 'viewer') {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    // Exclusively require standard environment variable names
    const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';

    if (!saEmail || !saKey || !spreadsheetId) {
      return NextResponse.json({ ok: false, error: 'CONFIGURATION_ERROR: Missing required Google Sheets environment variables' }, { status: 500 });
    }

    // Use admin client for internal outbox processing
    const adminSupabase = createAdminClient();

    // Query pending sync_outbox items
    const { data: pendingItems, error: outboxQueryErr } = await adminSupabase
      .from('sync_outbox')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (outboxQueryErr) {
      return NextResponse.json({ ok: false, error: `Failed to read sync_outbox: ${outboxQueryErr.message}` }, { status: 500 });
    }

    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, failed: 0, pending: 0, errors_sanitized: [] });
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
    const errorsSanitized: string[] = [];

    for (const item of pendingItems) {
      const tabName = entityTabMap[item.entity_type];
      if (!tabName) {
        failedCount++;
        errorsSanitized.push(`Unknown entity_type: ${item.entity_type}`);
        continue;
      }

      try {
        const entityId = item.entity_id;
        const payload = item.payload || {};
        const operation = item.operation || 'UPDATE';

        // Read all Column A UUIDs dynamically (no arbitrary range limit like A1:A500)
        const readRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A:A')}`, {
          headers: { Authorization: `Bearer ${sheetsToken}` }
        });
        
        if (!readRes.ok) {
          throw new Error(`Google Sheets API read failed with HTTP ${readRes.status}`);
        }

        const readData = await readRes.json();
        const rows = readData.values || [];

        let rowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          if (rows[i][0] === entityId) {
            rowIndex = i + 1;
            break;
          }
        }

        if (operation === 'DELETE') {
          if (rowIndex > 0) {
            const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A' + rowIndex + ':Z' + rowIndex)}:clear`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${sheetsToken}` }
            });
            if (!clearRes.ok) throw new Error(`Google Sheets clear failed with HTTP ${clearRes.status}`);
          }
        } else {
          // Serializers per entity type
          let rowValues: any[] = [];
          if (item.entity_type === 'wedding_guests') {
            rowValues = [entityId, payload.first_name || '', payload.last_name || '', payload.phone_e164 || '', payload.group_name || '', payload.family_side || '', payload.guest_category || 'Adulto', payload.attendance_status || 'pending', payload.dietary_type || '', payload.reconfirmation_status || 'pending', payload.guest_status || 'active', payload.version || 1, new Date().toISOString(), 'synced'];
          } else if (item.entity_type === 'wedding_tables') {
            rowValues = [entityId, payload.table_number || '', payload.name || '', payload.capacity || 10, payload.table_type || 'round_guest', payload.zone || 'Principal', payload.locked ? 'YES' : 'NO', payload.version || 1, new Date().toISOString(), 'synced'];
          } else if (item.entity_type === 'seating_assignments') {
            rowValues = [entityId, payload.guest_id || '', payload.table_id || '', payload.seat_number || '', payload.version || 1, new Date().toISOString(), 'synced'];
          } else if (item.entity_type === 'vendors') {
            rowValues = [entityId, payload.name || '', payload.category || '', payload.contact_name || '', payload.phone || '', payload.status || '', new Date().toISOString(), 'synced'];
          } else if (item.entity_type === 'expenses') {
            rowValues = [entityId, payload.vendor_id || '', payload.concept || '', payload.category || '', payload.currency || 'CLP', payload.total_amount || '', payload.payment_status || 'Pendiente', payload.due_date || '', payload.responsible || '', new Date().toISOString(), 'synced'];
          } else if (item.entity_type === 'expense_payments') {
            rowValues = [entityId, payload.expense_id || '', payload.amount || '', payload.currency || 'CLP', payload.payment_date || '', payload.payment_type || '', payload.status || 'Pagado', new Date().toISOString(), 'synced'];
          } else if (item.entity_type === 'rsvp_responses') {
            rowValues = [entityId, payload.first_name || '', payload.last_name || '', payload.phone_e164 || '', payload.attendance_status || '', payload.dietary_type || '', payload.dietary_detail || '', payload.source || 'web', payload.reconciliation_status || 'matched', payload.guest_id || '', payload.version || 1, new Date().toISOString(), 'synced'];
          }

          if (rowIndex > 0) {
            const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A' + rowIndex)}?valueInputOption=USER_ENTERED`, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${sheetsToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ values: [rowValues] })
            });
            if (!updateRes.ok) throw new Error(`Google Sheets update failed with HTTP ${updateRes.status}`);
          } else {
            const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A1')}:append?valueInputOption=USER_ENTERED`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${sheetsToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ values: [rowValues] })
            });
            if (!appendRes.ok) throw new Error(`Google Sheets append failed with HTTP ${appendRes.status}`);
          }
        }

        // Mark processed in Supabase DB
        const { error: markProcErr } = await adminSupabase
          .from('sync_outbox')
          .update({
            status: 'processed',
            processed_at: new Date().toISOString(),
            attempts: (item.attempts || 0) + 1
          })
          .eq('id', item.id);

        if (markProcErr) {
          throw new Error(`Failed to mark processed in DB: ${markProcErr.message}`);
        }

        processedCount++;
      } catch (err: any) {
        failedCount++;
        const sanitizedErr = err.message || 'Processing error';
        errorsSanitized.push(sanitizedErr);

        await adminSupabase
          .from('sync_outbox')
          .update({
            status: 'failed',
            attempts: (item.attempts || 0) + 1,
            last_error: sanitizedErr
          })
          .eq('id', item.id);
      }
    }

    return NextResponse.json({
      ok: true,
      processed: processedCount,
      failed: failedCount,
      pending: pendingItems.length - processedCount - failedCount,
      errors_sanitized: errorsSanitized
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
