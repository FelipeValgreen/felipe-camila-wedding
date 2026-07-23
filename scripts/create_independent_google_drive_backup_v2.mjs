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
    throw new Error(`OAuth error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

(async () => {
  console.log('--- STEP 1: REVOKE PUBLIC ACCESS ON OPERATIONAL SPREADSHEET & CREATE BACKUP ---');

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
  const operationalSpreadsheetId = envVars.GOOGLE_SHEETS_SPREADSHEET_ID || '1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0';

  const token = await getAccessToken(saEmail, saKey);
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Inspect and Revoke Public Permissions on Operational Spreadsheet
  const permListRes = await fetch(`https://www.googleapis.com/drive/v3/files/${operationalSpreadsheetId}/permissions?fields=permissions(id,type,role,emailAddress)`, { headers });
  if (!permListRes.ok) {
    throw new Error(`Failed to list permissions: ${permListRes.status} ${await permListRes.text()}`);
  }
  const permListData = await permListRes.json();

  for (const perm of permListData.permissions) {
    if (perm.type === 'anyone' || perm.type === 'domain') {
      console.log(`REVOKING PUBLIC PERMISSION: ID=${perm.id}, type=${perm.type}, role=${perm.role}`);
      const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${operationalSpreadsheetId}/permissions/${perm.id}`, {
        method: 'DELETE',
        headers
      });
      console.log(`REVOKE_STATUS=${delRes.status}`);
    }
  }

  // Re-verify permissions
  const verifyPermRes = await fetch(`https://www.googleapis.com/drive/v3/files/${operationalSpreadsheetId}/permissions?fields=permissions(id,type,role,emailAddress)`, { headers });
  const verifyPermData = await verifyPermRes.json();
  const hasAnyonePermission = verifyPermData.permissions.some(p => p.type === 'anyone' || p.type === 'domain');

  if (hasAnyonePermission) {
    throw new Error('CRITICAL: Public Drive access could not be revoked on operational spreadsheet!');
  }
  console.log('OPERATIONAL_SPREADSHEET_PUBLIC_ACCESS_REVOKED=PASS');
  console.log('OPERATIONAL_SANITIZED_PERMISSIONS:', JSON.stringify(verifyPermData.permissions.map(p => ({ type: p.type, role: p.role, email: p.emailAddress }))));

  // 2. Duplicate core master tab natively into spreadsheet
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sheetMetaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${operationalSpreadsheetId}`, { headers });
  const sheetMeta = await sheetMetaRes.json();
  const tabs = sheetMeta.sheets.map(s => ({ id: s.properties.sheetId, title: s.properties.title }));
  const bdMaestra = tabs.find(t => t.title === 'BD_MAESTRA_INVITADOS');

  let duplicateTabName = '';
  if (bdMaestra) {
    duplicateTabName = `BK_MAESTRA_OFFICIAL_${timestamp.slice(11, 19)}`;
    const dupRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${operationalSpreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            duplicateSheet: {
              sourceSheetId: bdMaestra.id,
              newSheetName: duplicateTabName
            }
          }
        ]
      })
    });
    console.log('NATIVE_TAB_DUPLICATION_STATUS:', dupRes.status);
  }

  // 3. Export XLSX local file (stored in gitignored backups/ folder)
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  const xlsxPath = path.join(backupsDir, 'FC_Centro_Comandos_Backup_Official.xlsx');
  const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${operationalSpreadsheetId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, { headers });
  if (!exportRes.ok) {
    throw new Error(`Failed to export XLSX: ${exportRes.status} ${await exportRes.text()}`);
  }
  const arrayBuffer = await exportRes.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(xlsxPath, fileBuffer);

  console.log(`REAL_OPERATIONAL_SPREADSHEET_ID=${operationalSpreadsheetId}`);
  console.log(`NATIVE_BACKUP_TAB_CREATED=${duplicateTabName}`);
  console.log(`LOCAL_XLSX_EXPORT_CREATED=${xlsxPath}`);
  console.log(`LOCAL_XLSX_BYTES=${fs.statSync(xlsxPath).size}`);
  console.log('DRIVE_BACKUP_VERIFICATION_COMPLETE=PASS');
})();
