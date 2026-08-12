import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function formatPrivateKey(key: string) { return key.replace(/\\n/g, '\n'); }

async function googleAccessToken(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');
  const unsigned = `${header}.${claims}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(formatPrivateKey(privateKey), 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GOOGLE_OAUTH_FAILED_${response.status}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error('GOOGLE_OAUTH_TOKEN_MISSING');
  return payload.access_token as string;
}

function clp(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/[^0-9-]/g, '');
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    const { data: profile } = await supabase.from('admin_profiles').select('active').eq('id', user.id).single();
    if (!profile?.active) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    if (!spreadsheetId || !serviceAccountEmail || !serviceAccountKey) throw new Error('GOOGLE_SHEETS_NOT_CONFIGURED');

    const token = await googleAccessToken(serviceAccountEmail, serviceAccountKey);
    const range = 'PRESUPUESTO_IGLESIA!A1:L80';
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`GOOGLE_SHEETS_READ_FAILED_${response.status}`);
    const payload = await response.json();
    const rows = (payload.values || []) as string[][];

    const itemRows = rows.slice(1).map((row, index) => ({ rowNumber: index + 2, row })).filter(({ rowNumber, row }) => rowNumber >= 2 && rowNumber <= 18 && row[0]);
    const items = itemRows.map(({ rowNumber, row }) => ({
      rowNumber,
      item: row[0] || '',
      projectedQuantity: row[1] || '',
      confirmedQuantity: row[2] || '',
      unitNet: clp(row[3]),
      vat: row[4] || '',
      projectedGross: clp(row[5]),
      category: row[6] || '',
      responsible: row[7] || '',
      status: row[8] || '',
      notes: row[9] || '',
      advance: clp(row[10]),
    }));

    const findValue = (label: string) => {
      const row = rows.find((candidate) => String(candidate?.[0] || '').trim().toLowerCase() === label.toLowerCase());
      return clp(row?.[5]);
    };

    return NextResponse.json({
      ok: true,
      source: 'F&C Centro Comandos · PRESUPUESTO_IGLESIA',
      items,
      summary: {
        paidOrPrepaid: findValue('Pagados o prepagados'),
        remaining: findValue('Faltante x pagar'),
        totalBudget: findValue('TOTAL PRESUPUESTO IGLESIA'),
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible leer el presupuesto operativo.' }, { status: 500 });
  }
}
