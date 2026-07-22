import crypto from 'crypto';

export function mapRSVPStatusToSheet(attendance_status, source) {
    if (attendance_status === 'not_attending') return 'No Asiste';
    if (attendance_status === 'pending') return 'Pendiente';
    if (attendance_status === 'attending') {
        if (source === 'web') return 'Confirmado Web';
        if (source === 'whatsapp') return 'Confirmado WhatsApp';
        return 'Confirmado Manual';
    }
    return 'Pendiente';
}

export function formatPrivateKey(key) {
    if (!key) return '';
    const escapedNewline = '\\' + 'n';
    return key.split(escapedNewline).join('\n');
}

function defaultSignJwt(signInput, formattedKey) {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signInput);
    return signer.sign(formattedKey, 'base64url');
}

export async function getGoogleAccessToken(email, privateKey, { fetchImpl = globalThis.fetch, signImpl = defaultSignJwt } = {}) {
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
    const signature = signImpl(signInput, formattedKey);

    const jwt = signInput + '.' + signature;

    const res = await fetchImpl('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    if (!res.ok) {
        throw new Error('GOOGLE_AUTH_FAILED_' + res.status);
    }
    const data = await res.json();
    if (!data.access_token) throw new Error('GOOGLE_ACCESS_TOKEN_MISSING');
    return data.access_token;
}

export async function syncToGoogleSheets(rsvpData, isUpdate = false, dependencies = {}) {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const tabName = process.env.GOOGLE_SHEETS_TAB || 'CONFIRMACIONES_RSVP_TEST';
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!spreadsheetId || !clientEmail || !privateKey) {
        return { synced: false, error: 'SHEETS_NOT_CONFIGURED' };
    }

    const fetchImpl = dependencies.fetchImpl || globalThis.fetch;

    try {
        const accessToken = await getGoogleAccessToken(clientEmail, privateKey, dependencies);
        const rowValues = [
            rsvpData.id || '',
            rsvpData.first_name || '',
            rsvpData.last_name || '',
            rsvpData.phone_e164 || '',
            mapRSVPStatusToSheet(rsvpData.attendance_status, rsvpData.source),
            rsvpData.source || 'web',
            rsvpData.dietary_type || 'Ninguna',
            rsvpData.dietary_detail || '',
            rsvpData.first_response_at || new Date().toISOString(),
            rsvpData.updated_at || new Date().toISOString(),
            rsvpData.reconfirmation_status || 'not_started',
            rsvpData.reconfirmed_at || '',
            ''
        ];

        let targetRowNumber = rsvpData.sheet_row_number;

        // Verify existing row number if provided
        if (isUpdate && targetRowNumber) {
            const checkUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/' + encodeURIComponent(tabName) + '!A' + targetRowNumber;
            const checkRes = await fetchImpl(checkUrl, {
                headers: { 'Authorization': 'Bearer ' + accessToken }
            });
            let isMatched = false;
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.values && checkData.values[0] && checkData.values[0][0] === rsvpData.id) {
                    isMatched = true;
                }
            }
            if (!isMatched) {
                targetRowNumber = null; // Stale row number, force UUID search
            }
        }

        if (isUpdate && !targetRowNumber) {
            // Search column A by UUID
            const searchUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/' + encodeURIComponent(tabName) + '!A:A';
            const searchRes = await fetchImpl(searchUrl, {
                headers: { 'Authorization': 'Bearer ' + accessToken }
            });

            if (!searchRes.ok) {
                return { synced: false, error: 'SHEETS_SEARCH_FAILED' };
            }

            const searchData = await searchRes.json();
            const values = searchData.values || [];
            for (let i = 0; i < values.length; i++) {
                if (values[i][0] === rsvpData.id) {
                    targetRowNumber = i + 1;
                    break;
                }
            }
        }

        if (isUpdate && targetRowNumber) {
            // Update exact row
            const updateUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/' + encodeURIComponent(tabName) + '!A' + targetRowNumber + ':M' + targetRowNumber + '?valueInputOption=USER_ENTERED';
            const updateRes = await fetchImpl(updateUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values: [rowValues] })
            });

            if (!updateRes.ok) throw new Error('SHEETS_UPDATE_HTTP_' + updateRes.status);
            return { synced: true, sheet_row_number: targetRowNumber };

        } else {
            // Append new row
            const appendUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/' + encodeURIComponent(tabName) + '!A:M:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS';
            const appendRes = await fetchImpl(appendUrl, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values: [rowValues] })
            });

            if (!appendRes.ok) throw new Error('SHEETS_APPEND_HTTP_' + appendRes.status);
            const appendData = await appendRes.json();

            let parsedRow = null;
            if (appendData.updates && appendData.updates.updatedRange) {
                const match = appendData.updates.updatedRange.match(/!A(\d+):/);
                if (match) parsedRow = parseInt(match[1], 10);
            }

            if (!parsedRow) {
                return { synced: false, error: 'UNPARSED_ROW_NUMBER' };
            }

            return {
                synced: true,
                sheet_row_number: parsedRow
            };
        }

    } catch (err) {
        console.error('Google Sheets Sync Failure:', err.message);
        return { synced: false, error: err.message || 'SHEETS_SYNC_FAILED' };
    }
}
