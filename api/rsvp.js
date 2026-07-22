import { validateRSVPInput, generateManageToken, hashToken } from './_lib/rsvp-service.js';
import { syncToGoogleSheets } from './_lib/google-sheets.js';

// In-memory fallback store for mock test environments when DB credentials are absent
const memoryRSVPStore = new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
        return res.status(400).json({ error: 'INVALID_CONTENT_TYPE' });
    }

    try {
        const body = req.body || {};

        // Honeypot check
        if (body.website && body.website.trim() !== '') {
            // Quietly reject bot submission
            return res.status(200).json({ ok: true, rsvp_id: 'rejected' });
        }

        const action = body.action || 'create';

        if (action === 'create') {
            const validation = validateRSVPInput({
                first_name: body.first_name,
                last_name: body.last_name,
                phone: body.phone,
                attendance_status: body.attendance_status,
                dietary_type: body.dietary_type,
                dietary_detail: body.dietary_detail
            });

            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }

            const rawToken = generateManageToken();
            const tokenHash = hashToken(rawToken);
            const rsvpId = 'rsvp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

            const rsvpRecord = {
                id: rsvpId,
                ...validation.data,
                source: 'web',
                reconfirmation_status: 'not_started',
                manage_token_hash: tokenHash,
                created_at: new Date().toISOString()
            };

            // Attempt Google Sheets Sync
            const sheetsResult = await syncToGoogleSheets(rsvpRecord, false);
            if (sheetsResult.synced) {
                rsvpRecord.sheet_row_number = sheetsResult.sheet_row_number;
                rsvpRecord.sheet_sync_status = 'synced';
            } else {
                rsvpRecord.sheet_sync_status = 'failed';
            }

            memoryRSVPStore.set(rsvpId, rsvpRecord);

            return res.status(200).json({
                ok: true,
                rsvp_id: rsvpId,
                manage_token: rawToken,
                attendance_status: rsvpRecord.attendance_status,
                dietary_type: rsvpRecord.dietary_type,
                dietary_detail: rsvpRecord.dietary_detail
            });

        } else if (action === 'update') {
            const { rsvp_id, manage_token, attendance_status, dietary_type, dietary_detail } = body;

            if (!rsvp_id || !manage_token) {
                return res.status(400).json({ error: 'Credenciales de modificación faltantes.' });
            }

            const existing = memoryRSVPStore.get(rsvp_id);
            if (!existing) {
                return res.status(401).json({ error: 'No se encontró el registro o token inválido.' });
            }

            const providedHash = hashToken(manage_token);
            if (existing.manage_token_hash !== providedHash) {
                return res.status(401).json({ error: 'No se encontró el registro o token inválido.' });
            }

            const validation = validateRSVPInput({
                first_name: existing.first_name,
                last_name: existing.last_name,
                phone: existing.phone_e164,
                attendance_status: attendance_status,
                dietary_type: dietary_type,
                dietary_detail: dietary_detail
            });

            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }

            existing.attendance_status = validation.data.attendance_status;
            existing.dietary_type = validation.data.dietary_type;
            existing.dietary_detail = validation.data.dietary_detail;
            existing.updated_at = new Date().toISOString();

            const sheetsResult = await syncToGoogleSheets(existing, true);
            if (sheetsResult.synced) {
                existing.sheet_sync_status = 'synced';
            }

            memoryRSVPStore.set(rsvp_id, existing);

            return res.status(200).json({
                ok: true,
                rsvp_id: rsvp_id,
                attendance_status: existing.attendance_status,
                dietary_type: existing.dietary_type,
                dietary_detail: existing.dietary_detail
            });

        } else {
            return res.status(400).json({ error: 'Acción no soportada.' });
        }

    } catch (err) {
        console.error('Server error in api/rsvp.js:', err);
        return res.status(500).json({ error: 'No se pudo procesar la confirmación en este momento.' });
    }
}
