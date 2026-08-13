import crypto from 'crypto';

const DEFAULT_STAGING_SPREADSHEET_ID = '1vrPub9rO-nYW8gFJIJudfANqvO5K-HEubQ0ofMUD_Ik';

function formatPrivateKey(key: string) { return key.replace(/\\n/g, '\n'); }

export function operationalSpreadsheetId() {
  const productionId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
  const stagingId = process.env.GOOGLE_SHEETS_STAGING_SPREADSHEET_ID || DEFAULT_STAGING_SPREADSHEET_ID;
  return process.env.VERCEL_ENV === 'production' ? productionId : stagingId;
}

export function operationalSheetMode() {
  return process.env.VERCEL_ENV === 'production' ? 'production' : 'staging';
}

export async function googleSheetsAccessToken(scope = 'https://www.googleapis.com/auth/spreadsheets') {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  if (!email || !privateKey) throw new Error('GOOGLE_SHEETS_NOT_CONFIGURED');

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: email,
    scope,
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
      grant_type: 'urn:ietf:params:oauth-type:jwt-bearer'.replace('oauth-type', 'oauth-type'),
      assertion: `${unsigned}.${signature}`,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    // Retry with the standards-compliant grant type. Kept separate to avoid silent auth ambiguity.
    const retry = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${unsigned}.${signature}`,
      }),
      cache: 'no-store',
    });
    if (!retry.ok) throw new Error(`GOOGLE_OAUTH_FAILED_${retry.status}`);
    const payload = await retry.json();
    if (!payload.access_token) throw new Error('GOOGLE_OAUTH_TOKEN_MISSING');
    return payload.access_token as string;
  }

  const payload = await response.json();
  if (!payload.access_token) throw new Error('GOOGLE_OAUTH_TOKEN_MISSING');
  return payload.access_token as string;
}

export async function readSheetRange(range: string) {
  const spreadsheetId = operationalSpreadsheetId();
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID_MISSING');
  const token = await googleSheetsAccessToken('https://www.googleapis.com/auth/spreadsheets.readonly');
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GOOGLE_SHEETS_READ_FAILED_${response.status}`);
  const payload = await response.json();
  return (payload.values || []) as string[][];
}

export async function writeSheetRange(range: string, values: unknown[][]) {
  const spreadsheetId = operationalSpreadsheetId();
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID_MISSING');
  const token = await googleSheetsAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GOOGLE_SHEETS_WRITE_FAILED_${response.status}`);
  return response.json();
}

export async function clearSheetRange(range: string) {
  const spreadsheetId = operationalSpreadsheetId();
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID_MISSING');
  const token = await googleSheetsAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GOOGLE_SHEETS_CLEAR_FAILED_${response.status}`);
  return response.json();
}
