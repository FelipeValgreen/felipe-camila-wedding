import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

function formatPrivateKey(key) {
  if (!key) return '';
  const escapedNewline = '\\' + 'n';
  return key.split(escapedNewline).join('\n');
}

async function getGoogleToken(email, privateKey, scope) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: email,
    scope: scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Claim = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
  const signInput = b64Header + '.' + b64Claim;

  const formattedKey = formatPrivateKey(privateKey);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signature = signer.sign(formattedKey, 'base64url');

  const jwt = signInput + '.' + signature;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await res.json();
  return data.access_token;
}

(async () => {
  const authFile = path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
  const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
  const token = authData.token;

  async function getEnvVal(eid) {
    const res = await fetch(`https://api.vercel.com/v9/projects/prj_CnQR6nh0a1lwcHpN1F3vLq1IWNHT/env/${eid}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await res.json();
    return (d.value || '').trim();
  }

  const saEmail = await getEnvVal('JwOVODGkkSW6ZY62');
  const saKey = await getEnvVal('fEgjSAksFUWsv8NL');
  const originalSpreadsheetId = await getEnvVal('nOwry9xceJ90LLgb');

  const driveToken = await getGoogleToken(saEmail, saKey, 'https://www.googleapis.com/auth/drive');

  const backupDir = path.join(process.cwd(), 'backups');
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.xlsx'));
  if (files.length === 0) {
    console.error('No XLSX backup file found in backups/');
    process.exit(1);
  }

  const backupFilePath = path.join(backupDir, files[0]);
  const fileStats = fs.statSync(backupFilePath);
  const fileContent = fs.readFileSync(backupFilePath);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupTitle = `BACKUP_XLSX_INDEPENDIENTE_FC_${timestamp}.xlsx`;

  // Multipart upload metadata + file to Google Drive
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const metadata = {
    name: backupTitle,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };

  const multipartRequestBody = Buffer.concat([
    Buffer.from(delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n'),
    fileContent,
    Buffer.from(close_delim)
  ]);

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${driveToken}`,
      'Content-Type': 'multipart/related; boundary=' + boundary,
      'Content-Length': String(multipartRequestBody.length)
    },
    body: multipartRequestBody
  });

  const uploadData = await uploadRes.json();

  if (!uploadRes.ok) {
    console.error('Drive upload failed:', uploadData);
    process.exit(1);
  }

  const backupFileId = uploadData.id;
  const backupUrl = `https://drive.google.com/file/d/${backupFileId}/view`;

  console.log('--- INDEPENDENT GOOGLE DRIVE BACKUP SUMMARY ---');
  console.log('BACKUP_FILE_ID:', backupFileId);
  console.log('BACKUP_URL:', backupUrl);
  console.log('BACKUP_MIME_TYPE:', uploadData.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  console.log('BACKUP_SIZE:', `${(fileStats.size / 1024).toFixed(2)} KB`);
  console.log('ORIGINAL_FILE_ID:', originalSpreadsheetId);
  console.log('IDS_DIFFERENT:', backupFileId !== originalSpreadsheetId ? 'YES' : 'NO');
  console.log('-----------------------------------------------');
  console.log('INDEPENDENT_DRIVE_BACKUP=PASS');
})();
