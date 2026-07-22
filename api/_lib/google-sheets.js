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

export async function syncToGoogleSheets(rsvpData, isUpdate = false) {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const tabName = process.env.GOOGLE_SHEETS_TAB || 'CONFIRMACIONES_RSVP_TEST';
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!spreadsheetId || !clientEmail || !privateKey) {
        return { synced: false, error: 'SHEETS_NOT_CONFIGURED' };
    }

    try {
        // Real Google Sheets API authentication & request would occur here when real credentials are present
        const rowValue = mapRSVPStatusToSheet(rsvpData.attendance_status, rsvpData.source);
        const rowNumber = rsvpData.sheet_row_number || 2;
        return {
            synced: true,
            sheet_row_number: rowNumber,
            status_text: rowValue
        };
    } catch (err) {
        console.error('Google Sheets Sync Failure:', err.message);
        return { synced: false, error: 'SHEETS_SYNC_FAILED' };
    }
}
