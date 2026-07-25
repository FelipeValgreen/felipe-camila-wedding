import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase-admin';

const ENTITY_TAB_MAP: Record<string, string> = {
  wedding_guests: 'INVITADOS_NUEVO',
  rsvp_responses: 'CONFIRMACIONES_RSVP',
  wedding_tables: 'MESAS_NUEVO',
  seating_assignments: 'ASIGNACIONES_MESA',
  vendors: 'PROVEEDORES',
  expenses: 'GASTOS',
  expense_payments: 'PAGOS'
};

interface OutboxItem {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: Record<string, any>;
  attempts: number;
}

interface ProcessOptions {
  limit?: number;
}

interface ProcessResult {
  ok: boolean;
  claimed: number;
  processed: number;
  failed: number;
  errors: string[];
}

function formatPrivateKey(key: string): string {
  return key.replace(/\\n/g, '\n');
}

function iso(value?: string | null): string {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

async function getGoogleAccessToken(email: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  })).toString('base64url');
  const unsigned = `${header}.${claims}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(formatPrivateKey(privateKey), 'base64url');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`GOOGLE_OAUTH_FAILED_${response.status}`);
  }

  const payload = await response.json();
  if (!payload.access_token) throw new Error('GOOGLE_OAUTH_TOKEN_MISSING');
  return payload.access_token;
}

async function googleRequest(
  url: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<any> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`GOOGLE_SHEETS_HTTP_${response.status}: ${detail}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function serializeEntity(entityType: string, entity: Record<string, any>): any[] {
  const id = entity.id || '';

  switch (entityType) {
    case 'wedding_guests':
      return [
        id,
        entity.first_name || '',
        entity.last_name || '',
        entity.phone_e164 || '',
        entity.group_name || '',
        entity.family_side || 'Compartido',
        entity.guest_category || 'Adulto',
        entity.attendance_status || 'pending',
        entity.dietary_type || '',
        entity.reconfirmation_status || 'pending',
        entity.guest_status || 'active',
        entity.version || 1,
        iso(entity.updated_at),
        'synced'
      ];

    case 'rsvp_responses':
      return [
        id,
        entity.first_name || '',
        entity.last_name || '',
        entity.phone_e164 || '',
        entity.attendance_status || '',
        entity.dietary_type || '',
        entity.dietary_detail || '',
        entity.source || 'web',
        entity.reconciliation_status || 'unmatched',
        entity.guest_id || '',
        entity.version || 1,
        iso(entity.updated_at),
        'synced'
      ];

    case 'wedding_tables':
      return [
        id,
        entity.table_number || '',
        entity.name || '',
        entity.capacity || 10,
        entity.table_type || 'round_guest',
        entity.zone || 'Principal',
        entity.locked ? 'YES' : 'NO',
        entity.version || 1,
        iso(entity.updated_at),
        'synced'
      ];

    case 'seating_assignments':
      return [
        id,
        entity.guest_id || '',
        entity.table_id || '',
        entity.seat_number || '',
        entity.version || 1,
        iso(entity.updated_at),
        'synced'
      ];

    case 'vendors':
      return [
        id,
        entity.name || '',
        entity.category || '',
        entity.contact_name || '',
        entity.phone || '',
        entity.status || '',
        iso(entity.updated_at),
        'synced'
      ];

    case 'expenses':
      return [
        id,
        entity.vendor_id || '',
        entity.concept || '',
        entity.category || '',
        entity.currency || 'CLP',
        entity.total_amount || '',
        entity.payment_status || 'Pendiente',
        entity.due_date || '',
        entity.responsible || '',
        iso(entity.updated_at),
        'synced'
      ];

    case 'expense_payments':
      return [
        id,
        entity.expense_id || '',
        entity.amount || '',
        entity.currency || 'CLP',
        entity.payment_date || '',
        entity.payment_type || '',
        entity.status || 'Pagado',
        iso(entity.updated_at),
        'synced'
      ];

    default:
      throw new Error(`UNSUPPORTED_ENTITY_TYPE_${entityType}`);
  }
}

function retryDelayMinutes(attempts: number): number {
  if (attempts <= 1) return 5;
  if (attempts === 2) return 15;
  if (attempts === 3) return 60;
  if (attempts === 4) return 180;
  return 720;
}

export async function processSyncOutbox(options: ProcessOptions = {}): Promise<ProcessResult> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';

  if (!spreadsheetId || !serviceAccountEmail || !serviceAccountKey) {
    throw new Error('CONFIGURATION_ERROR: Missing Google Sheets environment variables');
  }

  const admin = createAdminClient();
  const limit = Math.max(1, Math.min(options.limit || 50, 100));
  const { data: claimedData, error: claimError } = await admin.rpc('claim_sync_outbox_batch', {
    p_limit: limit
  });

  if (claimError) {
    throw new Error(`OUTBOX_CLAIM_FAILED: ${claimError.message}`);
  }

  const claimed = (claimedData || []) as OutboxItem[];
  if (claimed.length === 0) {
    return { ok: true, claimed: 0, processed: 0, failed: 0, errors: [] };
  }

  const accessToken = await getGoogleAccessToken(serviceAccountEmail, serviceAccountKey);
  const rowCache = new Map<string, Map<string, number>>();
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  async function getRowsForTab(tabName: string): Promise<Map<string, number>> {
    const existing = rowCache.get(tabName);
    if (existing) return existing;

    const payload = await googleRequest(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${tabName}!A:A`)}`,
      accessToken
    );
    const values = payload?.values || [];
    const rows = new Map<string, number>();
    values.forEach((row: any[], index: number) => {
      if (row?.[0]) rows.set(String(row[0]), index + 1);
    });
    rowCache.set(tabName, rows);
    return rows;
  }

  async function fetchCurrentEntity(item: OutboxItem): Promise<Record<string, any>> {
    if (item.operation === 'DELETE') return item.payload || { id: item.entity_id };

    const { data, error } = await admin
      .from(item.entity_type)
      .select('*')
      .eq('id', item.entity_id)
      .maybeSingle();

    if (error) throw new Error(`ENTITY_READ_FAILED_${item.entity_type}: ${error.message}`);
    return data || item.payload || { id: item.entity_id };
  }

  for (const item of claimed) {
    const tabName = ENTITY_TAB_MAP[item.entity_type];

    try {
      if (!tabName) throw new Error(`UNSUPPORTED_ENTITY_TYPE_${item.entity_type}`);
      const rows = await getRowsForTab(tabName);
      const rowNumber = rows.get(item.entity_id) || null;

      if (item.operation === 'DELETE') {
        if (rowNumber) {
          await googleRequest(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${tabName}!A${rowNumber}:Z${rowNumber}`)}:clear`,
            accessToken,
            { method: 'POST', body: '{}' }
          );
          rows.delete(item.entity_id);
        }
      } else {
        const entity = await fetchCurrentEntity(item);
        const rowValues = serializeEntity(item.entity_type, entity);

        if (rowNumber) {
          await googleRequest(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${tabName}!A${rowNumber}`)}?valueInputOption=RAW`,
            accessToken,
            { method: 'PUT', body: JSON.stringify({ values: [rowValues] }) }
          );
        } else {
          const appendPayload = await googleRequest(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${tabName}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
            accessToken,
            { method: 'POST', body: JSON.stringify({ values: [rowValues] }) }
          );
          const updatedRange = appendPayload?.updates?.updatedRange || '';
          const match = updatedRange.match(/!A(\d+):/);
          if (!match) throw new Error(`UNPARSED_APPEND_RANGE_${tabName}`);
          rows.set(item.entity_id, Number(match[1]));
        }
      }

      const finalRowNumber = (await getRowsForTab(tabName)).get(item.entity_id) || null;
      const { error: processedError } = await admin
        .from('sync_outbox')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          processing_started_at: null,
          next_retry_at: null,
          last_error: null
        })
        .eq('id', item.id)
        .eq('status', 'processing');
      if (processedError) throw new Error(`OUTBOX_MARK_PROCESSED_FAILED: ${processedError.message}`);

      if (item.entity_type === 'rsvp_responses' && item.operation !== 'DELETE') {
        const { error: rsvpStatusError } = await admin
          .from('rsvp_responses')
          .update({
            sheet_sync_status: 'synced',
            sheet_row_number: finalRowNumber
          })
          .eq('id', item.entity_id);
        if (rsvpStatusError) {
          throw new Error(`RSVP_SYNC_STATUS_FAILED: ${rsvpStatusError.message}`);
        }
      }

      processed++;
    } catch (error: any) {
      failed++;
      const safeError = String(error?.message || 'SYNC_PROCESSING_FAILED').slice(0, 500);
      errors.push(`${item.entity_type}:${item.entity_id}:${safeError}`);
      const nextRetry = new Date(
        Date.now() + retryDelayMinutes(item.attempts || 1) * 60 * 1000
      ).toISOString();

      await admin
        .from('sync_outbox')
        .update({
          status: 'failed',
          processing_started_at: null,
          next_retry_at: nextRetry,
          last_error: safeError
        })
        .eq('id', item.id);

      if (item.entity_type === 'rsvp_responses') {
        await admin
          .from('rsvp_responses')
          .update({ sheet_sync_status: 'failed' })
          .eq('id', item.entity_id);
      }
    }
  }

  return {
    ok: failed === 0,
    claimed: claimed.length,
    processed,
    failed,
    errors
  };
}
