import crypto from 'crypto';

export function mapRSVPStatusToSheet(attendanceStatus) {
    if (attendanceStatus === 'attending') return 'attending';
    if (attendanceStatus === 'not_attending') return 'not_attending';
    return 'pending';
}

export function formatPrivateKey(key) {
    if (!key) return '';
    const escapedNewline = '\\n';
    return key.split(escapedNewline).join('\n');
}

function defaultSignJwt(signInput, formattedKey) {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signInput);
    return signer.sign(formattedKey, 'base64url');
}

export async function getGoogleAccessToken(
    email,
    privateKey,
    { fetchImpl = globalThis.fetch, signImpl = defaultSignJwt } = {}
) {
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
    const signInput = `${b64Header}.${b64Claim}`;
    const formattedKey = formatPrivateKey(privateKey);
    const signature = signImpl(signInput, formattedKey);
    const jwt = `${signInput}.${signature}`;

    const response = await fetchImpl('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    if (!response.ok) throw new Error(`GOOGLE_AUTH_FAILED_${response.status}`);
    const data = await response.json();
    if (!data.access_token) throw new Error('GOOGLE_ACCESS_TOKEN_MISSING');
    return data.access_token;
}

function canonicalRSVPRow(rsvpData) {
    return [
        rsvpData.id || '',
        rsvpData.first_name || '',
        rsvpData.last_name || '',
        rsvpData.phone_e164 || '',
        mapRSVPStatusToSheet(rsvpData.attendance_status),
        rsvpData.dietary_type || '',
        rsvpData.dietary_detail || '',
        rsvpData.source || 'web',
        rsvpData.reconciliation_status || 'unmatched',
        rsvpData.guest_id || '',
        rsvpData.version || 1,
        rsvpData.updated_at || new Date().toISOString(),
        'synced'
    ];
}

export async function syncToGoogleSheets(rsvpData, isUpdate = false, dependencies = {}) {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const tabName = process.env.GOOGLE_SHEETS_TAB || 'CONFIRMACIONES_RSVP';
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!spreadsheetId || !clientEmail || !privateKey) {
        return { synced: false, error: 'SHEETS_NOT_CONFIGURED' };
    }

    const fetchImpl = dependencies.fetchImpl || globalThis.fetch;

    try {
        const accessToken = await getGoogleAccessToken(clientEmail, privateKey, dependencies);
        const rowValues = canonicalRSVPRow(rsvpData);
        let targetRowNumber = rsvpData.sheet_row_number || null;

        if (isUpdate && targetRowNumber) {
            const checkRange = encodeURIComponent(`${tabName}!A${targetRowNumber}`);
            const checkResponse = await fetchImpl(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${checkRange}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            let rowMatches = false;
            if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                rowMatches = checkData.values?.[0]?.[0] === rsvpData.id;
            }
            if (!rowMatches) targetRowNumber = null;
        }

        if (!targetRowNumber && rsvpData.id) {
            const searchRange = encodeURIComponent(`${tabName}!A:A`);
            const searchResponse = await fetchImpl(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${searchRange}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                const values = searchData.values || [];
                for (let index = 0; index < values.length; index++) {
                    if (values[index]?.[0] === rsvpData.id) {
                        targetRowNumber = index + 1;
                        break;
                    }
                }
            }
        }

        if (targetRowNumber) {
            const updateRange = encodeURIComponent(`${tabName}!A${targetRowNumber}:M${targetRowNumber}`);
            const updateResponse = await fetchImpl(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=RAW`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ values: [rowValues] })
                }
            );

            if (!updateResponse.ok) throw new Error(`SHEETS_UPDATE_HTTP_${updateResponse.status}`);
            return { synced: true, sheet_row_number: targetRowNumber };
        }

        const appendRange = encodeURIComponent(`${tabName}!A:M`);
        const appendResponse = await fetchImpl(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values: [rowValues] })
            }
        );

        if (!appendResponse.ok) throw new Error(`SHEETS_APPEND_HTTP_${appendResponse.status}`);
        const appendData = await appendResponse.json();
        const match = appendData.updates?.updatedRange?.match(/!A(\d+):/);
        const parsedRow = match ? Number(match[1]) : null;
        if (!parsedRow) return { synced: false, error: 'UNPARSED_ROW_NUMBER' };

        return { synced: true, sheet_row_number: parsedRow };
    } catch (error) {
        console.error('Google Sheets Sync Failure:', error.message);
        return { synced: false, error: error.message || 'SHEETS_SYNC_FAILED' };
    }
}
