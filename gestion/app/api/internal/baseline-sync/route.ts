import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ACTION = 'baseline_sheets_sync';

const HEADERS = {
  INVITADOS_NUEVO: [
    'UUID', 'First Name', 'Last Name', 'Phone E164', 'Group', 'Family Side',
    'Category', 'Attendance', 'Dietary Type', 'Reconfirmation', 'Guest Status',
    'Version', 'Updated At', 'Sync Status'
  ],
  CONFIRMACIONES_RSVP: [
    'UUID', 'First Name', 'Last Name', 'Phone E164', 'Attendance', 'Dietary Type',
    'Dietary Detail', 'Source', 'Reconciliation Status', 'Guest ID', 'Version',
    'Updated At', 'Sync Status'
  ],
  MESAS_NUEVO: [
    'UUID', 'Table Number', 'Name', 'Capacity', 'Table Type', 'Zone', 'Locked',
    'Version', 'Updated At', 'Sync Status'
  ],
  ASIGNACIONES_MESA: [
    'UUID', 'Guest ID', 'Table ID', 'Seat Number', 'Version', 'Updated At', 'Sync Status'
  ]
} as const;

type SheetName = keyof typeof HEADERS;
type RowsBySheet = Record<SheetName, unknown[][]>;

function formatPrivateKey(key: string): string {
  return key.replace(/\\n/g, '\n');
}

function iso(value?: string | null): string {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

async function googleAccessToken(email: string, privateKey: string): Promise<string> {
  const crypto = await import('crypto');
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

  if (!response.ok) throw new Error(`GOOGLE_OAUTH_FAILED_${response.status}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error('GOOGLE_OAUTH_TOKEN_MISSING');
  return payload.access_token;
}

async function googleJson(url: string, accessToken: string, init: RequestInit = {}): Promise<any> {
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
    const body = (await response.text()).slice(0, 300);
    throw new Error(`GOOGLE_SHEETS_HTTP_${response.status}: ${body}`);
  }

  return response.status === 204 ? null : response.json();
}

async function rebuildSheets(spreadsheetId: string, accessToken: string, rows: RowsBySheet): Promise<void> {
  await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        ranges: [
          'INVITADOS_NUEVO!A1:Z1005',
          'CONFIRMACIONES_RSVP!A1:Z1000',
          'MESAS_NUEVO!A1:Z1000',
          'ASIGNACIONES_MESA!A1:Z1000'
        ]
      })
    }
  );

  const data = (Object.keys(HEADERS) as SheetName[]).map(sheetName => ({
    range: `${sheetName}!A1`,
    majorDimension: 'ROWS',
    values: [HEADERS[sheetName], ...rows[sheetName]]
  }));

  await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'RAW', data })
    }
  );
}

async function verifySheets(
  spreadsheetId: string,
  accessToken: string,
  rows: RowsBySheet
): Promise<Record<SheetName, { expected: number; actual: number }>> {
  const params = new URLSearchParams();
  for (const sheetName of Object.keys(HEADERS) as SheetName[]) {
    params.append('ranges', `${sheetName}!A1:Z1005`);
  }
  params.set('majorDimension', 'ROWS');

  const payload = await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params.toString()}`,
    accessToken
  );

  const result = {} as Record<SheetName, { expected: number; actual: number }>;
  const valueRanges = payload.valueRanges || [];

  (Object.keys(HEADERS) as SheetName[]).forEach((sheetName, index) => {
    const values = valueRanges[index]?.values || [];
    const expected = rows[sheetName].length + 1;
    const actual = values.length;
    const header = values[0] || [];

    if (actual !== expected || header[0] !== 'UUID' || header.length !== HEADERS[sheetName].length) {
      throw new Error(`SHEET_VERIFICATION_FAILED_${sheetName}_${actual}_OF_${expected}`);
    }

    result[sheetName] = { expected, actual };
  });

  return result;
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('job') || '';
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    return NextResponse.json({ ok: false, error: 'VALID_JOB_ID_REQUIRED' }, { status: 400 });
  }

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';

  if (!serviceAccountEmail || !serviceAccountKey || !spreadsheetId) {
    return NextResponse.json({ ok: false, error: 'CONFIGURATION_ERROR' }, { status: 500 });
  }

  const admin = createAdminClient();
  let claimedJobId: string | null = null;

  try {
    const { data: claim, error: claimError } = await admin.rpc('claim_maintenance_job_by_id', {
      p_job_id: jobId,
      p_action: ACTION
    });

    if (claimError || !claim?.ok || !claim?.id) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_EXPIRED_OR_USED_JOB' },
        { status: 403 }
      );
    }
    claimedJobId = claim.id;

    const [guestsResult, rsvpResult, tablesResult, seatingResult] = await Promise.all([
      admin
        .from('wedding_guests')
        .select('id, first_name, last_name, phone_e164, group_name, family_side, guest_category, attendance_status, dietary_type, reconfirmation_status, guest_status, version, updated_at, source_row_number')
        .neq('guest_status', 'deleted')
        .order('source_row_number', { ascending: true, nullsFirst: false })
        .order('first_name', { ascending: true }),
      admin
        .from('rsvp_responses')
        .select('id, first_name, last_name, phone_e164, attendance_status, dietary_type, dietary_detail, source, reconciliation_status, guest_id, version, updated_at, created_at')
        .order('created_at', { ascending: true }),
      admin
        .from('wedding_tables')
        .select('id, table_number, name, capacity, table_type, zone, locked, version, updated_at')
        .order('table_number', { ascending: true }),
      admin
        .from('seating_assignments')
        .select('id, guest_id, table_id, seat_number, version, updated_at, created_at')
        .order('created_at', { ascending: true })
    ]);

    const errors = [guestsResult.error, rsvpResult.error, tablesResult.error, seatingResult.error].filter(Boolean);
    if (errors.length) {
      throw new Error(`SUPABASE_READ_FAILED: ${errors.map(error => error?.message).join(' | ')}`);
    }

    const guests = guestsResult.data || [];
    const rsvps = rsvpResult.data || [];
    const tables = tablesResult.data || [];
    const seating = seatingResult.data || [];

    const rows: RowsBySheet = {
      INVITADOS_NUEVO: guests.map(guest => [
        guest.id, guest.first_name || '', guest.last_name || '', guest.phone_e164 || '',
        guest.group_name || '', guest.family_side || 'Compartido', guest.guest_category || 'Adulto',
        guest.attendance_status || 'pending', guest.dietary_type || '',
        guest.reconfirmation_status || 'pending', guest.guest_status || 'active',
        guest.version || 1, iso(guest.updated_at), 'synced'
      ]),
      CONFIRMACIONES_RSVP: rsvps.map(rsvp => [
        rsvp.id, rsvp.first_name || '', rsvp.last_name || '', rsvp.phone_e164 || '',
        rsvp.attendance_status || '', rsvp.dietary_type || '', rsvp.dietary_detail || '',
        rsvp.source || 'web', rsvp.reconciliation_status || 'unmatched', rsvp.guest_id || '',
        rsvp.version || 1, iso(rsvp.updated_at), 'synced'
      ]),
      MESAS_NUEVO: tables.map(table => [
        table.id, table.table_number, table.name || '', table.capacity || 10,
        table.table_type || 'round_guest', table.zone || 'Principal',
        table.locked ? 'YES' : 'NO', table.version || 1, iso(table.updated_at), 'synced'
      ]),
      ASIGNACIONES_MESA: seating.map(assignment => [
        assignment.id, assignment.guest_id, assignment.table_id, assignment.seat_number || '',
        assignment.version || 1, iso(assignment.updated_at), 'synced'
      ])
    };

    const accessToken = await googleAccessToken(serviceAccountEmail, serviceAccountKey);
    await rebuildSheets(spreadsheetId, accessToken, rows);
    const verification = await verifySheets(spreadsheetId, accessToken, rows);

    const rsvpIds = rsvps.map(rsvp => rsvp.id);
    if (rsvpIds.length) {
      const { error } = await admin
        .from('rsvp_responses')
        .update({ sheet_sync_status: 'synced' })
        .in('id', rsvpIds);
      if (error) throw new Error(`RSVP_SYNC_STATUS_FAILED: ${error.message}`);
    }

    await admin
      .from('management_issues')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: 'baseline_sheets_sync',
        resolution_note: 'Resuelto mediante reconstrucción canónica y verificada del espejo de Google Sheets.'
      })
      .eq('status', 'open')
      .eq('issue_type', 'sheet_sync_failed');

    const result = {
      guests: guests.length,
      rsvp_responses: rsvps.length,
      tables: tables.length,
      seating_assignments: seating.length,
      verification,
      spreadsheet_id: spreadsheetId,
      completed_at: new Date().toISOString()
    };

    await admin.from('audit_log').insert({
      entity_type: 'maintenance_jobs',
      entity_id: claimedJobId,
      action: 'BASELINE_SHEETS_SYNC',
      after_data: result,
      actor: 'one_time_maintenance_endpoint',
      origin: 'maintenance'
    });

    await admin
      .from('maintenance_jobs')
      .update({ status: 'succeeded', used_at: new Date().toISOString(), result, last_error: null })
      .eq('id', claimedJobId);

    return NextResponse.json({ ok: true, counts: result });
  } catch (error: any) {
    const safeError = String(error?.message || 'BASELINE_SYNC_FAILED').slice(0, 500);
    if (claimedJobId) {
      await admin
        .from('maintenance_jobs')
        .update({ status: 'failed', last_error: safeError })
        .eq('id', claimedJobId);
    }
    return NextResponse.json({ ok: false, error: safeError }, { status: 500 });
  }
}
