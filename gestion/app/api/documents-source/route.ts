import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function formatPrivateKey(key: string) { return key.replace(/\\n/g, '\n'); }

async function googleAccessToken(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
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
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth-type:jwt-bearer'.replace('oauth-type', 'oauth-grant-type'),
      assertion: `${unsigned}.${signature}`,
    }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GOOGLE_OAUTH_FAILED_${response.status}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error('GOOGLE_OAUTH_TOKEN_MISSING');
  return payload.access_token as string;
}

async function ensureAuthorized() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 }) };
  const { data: profile } = await supabase.from('admin_profiles').select('active').eq('id', user.id).single();
  if (!profile?.active) return { error: NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 }) };
  return { user };
}

function env() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  if (!spreadsheetId || !email || !key) throw new Error('GOOGLE_SHEETS_NOT_CONFIGURED');
  return { spreadsheetId, email, key };
}

async function readRows(spreadsheetId: string, token: string) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('DOCUMENTOS!A1:H200')}?majorDimension=ROWS`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  );
  if (!response.ok) throw new Error(`GOOGLE_SHEETS_READ_FAILED_${response.status}`);
  const payload = await response.json();
  return (payload.values || []) as string[][];
}

export async function GET() {
  try {
    const auth = await ensureAuthorized();
    if ('error' in auth) return auth.error;
    const { spreadsheetId, email, key } = env();
    const token = await googleAccessToken(email, key);
    const rows = await readRows(spreadsheetId, token);
    const items = rows.slice(1).filter((row) => row[1] || row[2]).map((row, index) => ({
      rowNumber: index + 2,
      category: row[0] || 'General',
      title: row[1] || 'Documento sin título',
      url: row[2] || '',
      type: row[3] || 'Documento',
      status: row[4] || 'Referencia',
      source: row[5] || 'Drive',
      notes: row[6] || '',
      updated: row[7] || '',
    }));
    return NextResponse.json({
      ok: true,
      source: 'F&C Centro Comandos · DOCUMENTOS',
      items,
      summary: {
        total: items.length,
        active: items.filter((item) => item.status.toLowerCase() === 'activo').length,
        reference: items.filter((item) => item.status.toLowerCase() === 'referencia').length,
        categories: new Set(items.map((item) => item.category)).size,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible leer el registro documental.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await ensureAuthorized();
    if ('error' in auth) return auth.error;
    const host = (request.headers.get('host') || '').split(':')[0];
    if (host !== 'gestion.felipeycami.cl') {
      return NextResponse.json({ ok: false, error: 'PREVIEW_WRITE_BLOCKED' }, { status: 409 });
    }
    const body = await request.json();
    const title = String(body.title || '').trim();
    const url = String(body.url || '').trim();
    if (!title || !url) return NextResponse.json({ ok: false, error: 'TITLE_AND_URL_REQUIRED' }, { status: 400 });
    if (!/^https?:\/\//i.test(url)) return NextResponse.json({ ok: false, error: 'INVALID_URL' }, { status: 400 });

    const { spreadsheetId, email, key } = env();
    const token = await googleAccessToken(email, key);
    const values = [[
      String(body.category || 'General'),
      title,
      url,
      String(body.type || 'Documento'),
      String(body.status || 'Activo'),
      String(body.source || 'Drive'),
      String(body.notes || ''),
      new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }),
    ]];
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('DOCUMENTOS!A:H')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
        cache: 'no-store',
      },
    );
    if (!response.ok) throw new Error(`GOOGLE_SHEETS_APPEND_FAILED_${response.status}`);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible agregar el documento.' }, { status: 500 });
  }
}
