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

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    const { data: profile } = await supabase.from('admin_profiles').select('active').eq('id', user.id).single();
    if (!profile?.active) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    if (!spreadsheetId || !email || !key) throw new Error('GOOGLE_SHEETS_NOT_CONFIGURED');

    const token = await googleAccessToken(email, key);
    const range = 'TIMELINE!A1:G200';
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    if (!response.ok) throw new Error(`GOOGLE_SHEETS_READ_FAILED_${response.status}`);
    const payload = await response.json();
    const rows = (payload.values || []) as string[][];

    const items = rows.slice(1).filter((row) => row[0] || row[1]).map((row, index) => ({
      rowNumber: index + 2,
      dateTime: row[0] || '',
      block: row[1] || '',
      owner: row[2] || '',
      duration: row[3] || '',
      status: row[4] || '',
      dependencies: row[5] || '',
      notes: row[6] || '',
    }));

    const confirmed = items.filter((item) => item.status.toLowerCase() === 'confirmado').length;
    const pending = items.filter((item) => item.status.toLowerCase() !== 'confirmado').length;

    return NextResponse.json({
      ok: true,
      source: 'F&C Centro Comandos · TIMELINE',
      items,
      summary: { total: items.length, confirmed, pending },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible leer el cronograma.' }, { status: 500 });
  }
}
