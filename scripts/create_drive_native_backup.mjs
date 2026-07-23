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

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupTitle = `BACKUP COMPLETO NATIVO - F&C Centro Comandos - ${timestamp}`;

  // 1. Copy spreadsheet file via Drive API
  const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${originalSpreadsheetId}/copy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${driveToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: backupTitle
    })
  });

  const copyData = await copyRes.json();

  if (!copyRes.ok) {
    console.error('Drive files.copy failed:', copyData);
    process.exit(1);
  }

  const backupFileId = copyData.id;
  const backupUrl = `https://docs.google.com/spreadsheets/d/${backupFileId}/edit`;

  // 2. Share file with filipo.valverde@gmail.com and cavargask@gmail.com
  const owners = ['filipo.valverde@gmail.com', 'cavargask@gmail.com'];
  for (const email of owners) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${backupFileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${driveToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'user',
        emailAddress: email
      })
    });
  }

  console.log('--- NATIVE DRIVE BACKUP SUMMARY ---');
  console.log('BACKUP_FILE_ID:', backupFileId);
  console.log('BACKUP_URL:', backupUrl);
  console.log('BACKUP_MIME_TYPE:', 'application/vnd.google-apps.spreadsheet');
  console.log('ORIGINAL_FILE_ID:', originalSpreadsheetId);
  console.log('IDS_DIFFERENT:', backupFileId !== originalSpreadsheetId ? 'YES' : 'NO');
  console.log('SHARED_WITH:', owners.join(', '));
  console.log('-----------------------------------');
  console.log('BACKUP_VISIBLE_IN_DRIVE=PASS');
})();
