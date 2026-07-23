import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function base64url(source) {
  let encoded = Buffer.isBuffer(source) ? source.toString('base64') : Buffer.from(source).toString('base64');
  return encoded.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken(email, privateKey) {
  const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const claimSet = JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  });

  const unsignedToken = `${base64url(header)}.${base64url(claimSet)}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const signature = signer.sign(privateKey);
  const jwt = `${unsignedToken}.${base64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`OAuth error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

(async () => {
  console.log('--- CREATING REAL GOOGLE SHEETS TAB BACKUPS & LOCAL XLSX EXPORT ---');

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
  let saKey = envVars.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (saKey) saKey = saKey.replace(/\\n/g, '\n');
  const spreadsheetId = envVars.GOOGLE_SHEETS_SPREADSHEET_ID || '1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0';

  const token = await getAccessToken(saEmail, saKey);
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Get original spreadsheet metadata
  const sheetMetaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, { headers });
  const sheetMeta = await sheetMetaRes.json();
  const tabs = sheetMeta.sheets.map(s => ({ id: s.properties.sheetId, title: s.properties.title }));
  console.log('SOURCE SPREADSHEET TABS COUNT:', tabs.length);

  // 2. Duplicate core master tab (BD_MAESTRA_INVITADOS) natively into spreadsheet
  const bdMaestra = tabs.find(t => t.title === 'BD_MAESTRA_INVITADOS');
  if (bdMaestra) {
    const timeTag = new Date().toISOString().replace(/[:.]/g, '-');
    const dupRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            duplicateSheet: {
              sourceSheetId: bdMaestra.id,
              newSheetName: `BK_MAESTRA_${timeTag.slice(11, 19)}`
            }
          }
        ]
      })
    });
    const dupData = await dupRes.json();
    console.log('NATIVE TAB DUPLICATION RESULT:', dupRes.status, dupData.replies ? 'PASS' : dupData);
  }

  // 3. Export local XLSX backup file
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  const xlsxPath = path.join(backupsDir, `FC_Centro_Comandos_Backup_Official.xlsx`);
  const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, { headers });
  const arrayBuffer = await exportRes.arrayBuffer();
  fs.writeFileSync(xlsxPath, Buffer.from(arrayBuffer));
  console.log(`REAL_SPREADSHEET_ID=${spreadsheetId}`);
  console.log(`LOCAL_XLSX_EXPORT_CREATED=${xlsxPath}`);
  console.log(`LOCAL_XLSX_BYTES=${fs.statSync(xlsxPath).size}`);
})();
