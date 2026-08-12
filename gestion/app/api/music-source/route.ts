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
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GOOGLE_OAUTH_FAILED_${response.status}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error('GOOGLE_OAUTH_TOKEN_MISSING');
  return payload.access_token as string;
}

async function readRange(spreadsheetId: string, token: string, range: string) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  );
  if (!response.ok) throw new Error(`GOOGLE_SHEETS_READ_FAILED_${response.status}`);
  const payload = await response.json();
  return (payload.values || []) as string[][];
}

function clp(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/[^0-9-]/g, '');
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function containsMusicSignal(values: string[]) {
  const haystack = values.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return ['musica', 'dj', 'banda', 'sonido', 'playlist', 'disociados', 'fiesta', 'cocktail'].some((term) => haystack.includes(term));
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
    const [timelineRows, budgetRows] = await Promise.all([
      readRange(spreadsheetId, token, 'TIMELINE!A1:G200'),
      readRange(spreadsheetId, token, 'PRESUPUESTO_IGLESIA!A1:K80'),
    ]);

    const moments = timelineRows.slice(1).filter((row) => row[0] || row[1]).map((row, index) => ({
      rowNumber: index + 2,
      dateTime: row[0] || '',
      block: row[1] || '',
      owner: row[2] || '',
      duration: row[3] || '',
      status: row[4] || '',
      dependencies: row[5] || '',
      notes: row[6] || '',
    })).filter((item) => containsMusicSignal([item.block, item.owner, item.dependencies, item.notes]));

    const budgetItems = budgetRows.slice(1).filter((row) => row[0]).map((row, index) => ({
      rowNumber: index + 2,
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
    })).filter((item) => containsMusicSignal([item.item, item.category, item.responsible, item.status, item.notes]));

    const confirmedMoments = moments.filter((item) => item.status.toLowerCase() === 'confirmado').length;
    const pendingMoments = moments.length - confirmedMoments;
    const confirmedBudget = budgetItems.filter((item) => item.status.toLowerCase() === 'confirmado').length;
    const pendingBudget = budgetItems.length - confirmedBudget;
    const budgetTotal = budgetItems.reduce((sum, item) => sum + Number(item.projectedGross || 0), 0);

    return NextResponse.json({
      ok: true,
      sources: ['F&C Centro Comandos · TIMELINE', 'F&C Centro Comandos · PRESUPUESTO_IGLESIA'],
      moments,
      budgetItems,
      summary: {
        moments: moments.length,
        confirmedMoments,
        pendingMoments,
        budgetItems: budgetItems.length,
        confirmedBudget,
        pendingBudget,
        budgetTotal,
        hasDetailedPlaylist: false,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible leer la operación musical.' }, { status: 500 });
  }
}
