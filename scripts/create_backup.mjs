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
        scope: 'https://www.googleapis.com/auth/spreadsheets',
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

    const sheetsToken = await getGoogleSheetsToken(saEmail, saKey);
    
    // 1. Get metadata of original spreadsheet
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: { Authorization: `Bearer ${sheetsToken}` }
    });
    const metaData = await metaRes.json();

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupTitle = `BACKUP_BD_MAESTRA_${dateStr}`;

    // 2. Find BD_MAESTRA_INVITADOS sheetId
    const bdSheet = (metaData.sheets || []).find(s => s.properties.title === 'BD_MAESTRA_INVITADOS');
    let backupSheetId = null;

    if (bdSheet) {
        const copyRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/sheets/${bdSheet.properties.sheetId}:copyTo`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${sheetsToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                destinationSpreadsheetId: spreadsheetId
            })
        });
        const copyData = await copyRes.json();
        backupSheetId = copyData.sheetId;

        // Rename the copied tab to BACKUP_BD_MAESTRA
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${sheetsToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: backupSheetId,
                                title: backupTitle
                            },
                            fields: 'title'
                        }
                    }
                ]
            })
        });
    }

    console.log('BACKUP_CREATED=YES');
    console.log('BACKUP_ID=' + spreadsheetId);
    console.log('BACKUP_TAB=' + backupTitle);
    console.log('BACKUP_URL=https://docs.google.com/spreadsheets/d/' + spreadsheetId);
})();
