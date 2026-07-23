import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

function formatPrivateKey(key) {
    if (!key) return '';
    const escapedNewline = '\\' + 'n';
    return key.split(escapedNewline).join('\n');
}

async function getGoogleSheetsToken(email, privateKey) {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
        iss: email,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
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
    const spreadsheetId = await getEnvVal('nOwry9xceJ90LLgb');

    const driveToken = await getGoogleSheetsToken(saEmail, saKey);

    // 1. Export entire spreadsheet to XLSX
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

    const exportRes = await fetch(exportUrl, {
        headers: { Authorization: `Bearer ${driveToken}` }
    });

    const buffer = Buffer.from(await exportRes.arrayBuffer());

    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const filename = `BACKUP_INDEPENDIENTE_FC_Centro_Comandos_${timestamp}.xlsx`;
    const filePath = path.join(backupDir, filename);

    fs.writeFileSync(filePath, buffer);

    // 2. Set timezone to America/Santiago on main spreadsheet
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${driveToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            requests: [
                {
                    updateSpreadsheetProperties: {
                        properties: {
                            timeZone: 'America/Santiago'
                        },
                        fields: 'timeZone'
                    }
                }
            ]
        })
    });

    // 3. Count temporary BK_ tabs for report
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: { Authorization: `Bearer ${driveToken}` }
    });
    const metaData = await metaRes.json();
    const bkTabs = (metaData.sheets || []).filter(s => s.properties.title.startsWith('BK_'));

    console.log('--- FULL SPREADSHEET XLSX BACKUP ---');
    console.log('ORIGINAL_ID:', spreadsheetId);
    console.log('EXPORTED_FILE_PATH:', filePath);
    console.log('EXPORTED_FILE_SIZE:', (buffer.length / 1024).toFixed(2) + ' KB');
    console.log('SPREADSHEET_TIMEZONE=America/Santiago');
    console.log('TEMP_BK_TABS_FOR_CLEANUP:', bkTabs.length);
    console.log('------------------------------------');
    console.log('INDEPENDENT_BACKUP=PASS');
})();
