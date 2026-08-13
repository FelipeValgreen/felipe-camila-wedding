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

async function operationalSheetContext() {
  const spreadsheetId = operationalSpreadsheetId();
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID_MISSING');
  const token = await googleSheetsAccessToken();
  return { spreadsheetId, token };
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
  const { spreadsheetId, token } = await operationalSheetContext();
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
  const { spreadsheetId, token } = await operationalSheetContext();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GOOGLE_SHEETS_CLEAR_FAILED_${response.status}`);
  return response.json();
}

async function sheetIdByTitle(sheetTitle: string, spreadsheetId: string, token: string) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GOOGLE_SHEETS_METADATA_FAILED_${response.status}`);
  const payload = await response.json();
  const sheet = (payload.sheets || []).find((item: any) => item?.properties?.title === sheetTitle);
  if (!sheet) throw new Error(`GOOGLE_SHEET_NOT_FOUND_${sheetTitle}`);
  return Number(sheet.properties.sheetId);
}

export async function insertSheetRow(sheetTitle: string, rowNumber: number, values: unknown[]) {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error('INVALID_ROW_NUMBER');
  const { spreadsheetId, token } = await operationalSheetContext();
  const sheetId = await sheetIdByTitle(sheetTitle, spreadsheetId, token);
  const startIndex = rowNumber - 1;
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ insertDimension: { range: { sheetId, dimension: 'ROWS', startIndex, endIndex: startIndex + 1 }, inheritFromBefore: true } }] }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GOOGLE_SHEETS_INSERT_ROW_FAILED_${response.status}`);
  await writeSheetRange(`${sheetTitle}!A${rowNumber}:${String.fromCharCode(64 + Math.max(1, values.length))}${rowNumber}`, [values]);
}

export async function deleteSheetRow(sheetTitle: string, rowNumber: number) {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error('INVALID_ROW_NUMBER');
  const { spreadsheetId, token } = await operationalSheetContext();
  const sheetId = await sheetIdByTitle(sheetTitle, spreadsheetId, token);
  const startIndex = rowNumber - 1;
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex, endIndex: startIndex + 1 } } }] }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GOOGLE_SHEETS_DELETE_ROW_FAILED_${response.status}`);
}
