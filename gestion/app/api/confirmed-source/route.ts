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

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });

    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('active')
      .eq('id', user.id)
      .single();
    if (!profile?.active) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    if (!spreadsheetId || !serviceAccountEmail || !serviceAccountKey) {
      throw new Error('GOOGLE_SHEETS_NOT_CONFIGURED');
    }

    const token = await googleAccessToken(serviceAccountEmail, serviceAccountKey);
    const [confirmedRows, groupRows] = await Promise.all([
      readRange(spreadsheetId, token, 'CONFIRMADOS_ACTUALES!A1:J200'),
      readRange(spreadsheetId, token, 'GRUPOS_MESA!A1:H200'),
    ]);

    const people = confirmedRows.slice(1).filter((row) => row[0]).map((row, index) => ({
      rowNumber: index + 2,
      name: row[0] || '',
      attendance: row[1] || '',
      dietaryType: row[2] || '',
      dietaryDetail: row[3] || '',
      recordStatus: row[4] || '',
      guestId: row[5] || null,
      rsvpId: row[6] || null,
      confirmedAt: row[7] || null,
      syncStatus: row[8] || '',
      phone: row[9] || '',
    }));

    const attending = people.filter((person) => person.attendance === 'Asiste');
    const declined = people.filter((person) => person.attendance === 'No asiste');
    const associated = attending.filter((person) => person.recordStatus === 'Ficha asociada');
    const withoutMasterRecord = attending.filter((person) => person.recordStatus === 'Sin ficha maestra');
    const dietary = attending.filter((person) => person.dietaryType && person.dietaryType !== 'Ninguna');
    const latest = attending[attending.length - 1] || null;

    const groupMembers = groupRows.slice(1).filter((row) => row[0] && row[2]).map((row, index) => ({
      rowNumber: index + 2,
      groupId: row[0] || '',
      groupName: row[1] || '',
      person: row[2] || '',
      linkType: row[3] || '',
      relation: row[4] || '',
      rsvpStatus: row[5] || '',
      tableAssigned: row[6] || '',
      sourceNote: row[7] || '',
    }));

    const grouped = Array.from(groupMembers.reduce((map, member) => {
      const current = map.get(member.groupId) || {
        groupId: member.groupId,
        groupName: member.groupName,
        linkType: member.linkType,
        confirmed: member.linkType !== 'Por validar',
        people: [] as string[],
        sourceNotes: [] as string[],
      };
      current.people.push(member.person);
      if (member.sourceNote && !current.sourceNotes.includes(member.sourceNote)) current.sourceNotes.push(member.sourceNote);
      if (member.linkType === 'Por validar') current.confirmed = false;
      map.set(member.groupId, current);
      return map;
    }, new Map<string, { groupId: string; groupName: string; linkType: string; confirmed: boolean; people: string[]; sourceNotes: string[] }>()).values());

    return NextResponse.json({
      ok: true,
      source: 'F&C Centro Comandos · CONFIRMADOS_ACTUALES',
      groupsSource: 'F&C Centro Comandos · GRUPOS_MESA',
      summary: {
        attending: attending.length,
        declined: declined.length,
        totalResponsesPeople: people.length,
        associated: associated.length,
        withoutMasterRecord: withoutMasterRecord.length,
        dietary: dietary.length,
        latestConfirmationName: latest?.name || null,
        latestConfirmationAt: latest?.confirmedAt || null,
      },
      people,
      groups: grouped,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible leer confirmados y grupos.' }, { status: 500 });
  }
}
