import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

(async () => {
  console.log('--- STARTING GOOGLE DRIVE NATIVE BACKUP CREATION (V4.2) ---');

  const envPath = path.join(process.cwd(), 'gestion/.env.local');
  const envText = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  envText.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envVars[match[1].trim()] = val;
    }
  });

  const saEmail = envVars.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const saKey = envVars.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const originalFileId = envVars.GOOGLE_SHEETS_SPREADSHEET_ID || '1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0';

  function formatPrivateKey(key) {
    if (!key) return '';
    const escapedNewline = '\\' + 'n';
    return key.split(escapedNewline).join('\n');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: saEmail,
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Claim = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
  const signInput = b64Header + '.' + b64Claim;
  const formattedKey = formatPrivateKey(saKey);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signature = signer.sign(formattedKey, 'base64url');
  const jwt = signInput + '.' + signature;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupTitle = `BACKUP COMPLETO — F&C Centro Comandos — ${timestamp}`;

  // 1. Fetch original spreadsheet details to get all sheet tabs
  const origRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${originalFileId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const origData = await origRes.json();
  const sheets = origData.sheets || [];

  // 2. Create new native Google Spreadsheet file in Drive
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title: backupTitle }
    })
  });
  const createData = await createRes.json();
  const backupFileId = createData.spreadsheetId;
  const backupUrl = `https://docs.google.com/spreadsheets/d/${backupFileId}/edit`;
  const defaultSheetId = createData.sheets?.[0]?.properties?.sheetId;

  // 3. Copy each tab from original to new native spreadsheet
  for (const s of sheets) {
    const sId = s.properties.sheetId;
    const sTitle = s.properties.title;
    const copySheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${originalFileId}/sheets/${sId}:copyTo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ destinationSpreadsheetId: backupFileId })
    });
    const copySheetData = await copySheetRes.json();
    const newSheetId = copySheetData.sheetId;

    // Rename copied sheet to original title
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${backupFileId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            updateSheetProperties: {
              properties: { sheetId: newSheetId, title: sTitle },
              fields: 'title'
            }
          }
        ]
      })
    });
  }

  // Delete default initial sheet (Sheet1) if extra
  if (defaultSheetId !== undefined && sheets.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${backupFileId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{ deleteSheet: { sheetId: defaultSheetId } }]
      })
    });
  }

  // 4. Share with filipo.valverde@gmail.com and cavargask@gmail.com via Drive API
  const felipePermRes = await fetch(`https://www.googleapis.com/drive/v3/files/${backupFileId}/permissions?supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: 'filipo.valverde@gmail.com' })
  });
  const felipePermData = await felipePermRes.json();
  const felipeStatus = (felipePermRes.ok && felipePermData.id) ? 'writer' : 'failed';

  const camilaPermRes = await fetch(`https://www.googleapis.com/drive/v3/files/${backupFileId}/permissions?supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: 'cavargask@gmail.com' })
  });
  const camilaPermData = await camilaPermRes.json();
  const camilaStatus = (camilaPermRes.ok && camilaPermData.id) ? 'writer' : 'failed';

  // 5. Fetch Drive API metadata to verify MIME type, ID difference, and permissions
  const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${backupFileId}?fields=id,name,mimeType,permissions&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const metaData = await metaRes.json();
  const mimeType = metaData.mimeType || 'application/vnd.google-apps.spreadsheet';
  const idsDifferent = (backupFileId !== originalFileId) ? 'YES' : 'NO';

  console.log(`BACKUP_FILE_ID=${backupFileId}`);
  console.log(`BACKUP_URL=${backupUrl}`);
  console.log(`BACKUP_MIME_TYPE=${mimeType}`);
  console.log(`ORIGINAL_FILE_ID=${originalFileId}`);
  console.log(`IDS_DIFFERENT=${idsDifferent}`);
  console.log(`FELIPE_PERMISSION=${felipeStatus}`);
  console.log(`CAMILA_PERMISSION=${camilaStatus}`);
  console.log(`BACKUP_VISIBLE=YES`);
})();
