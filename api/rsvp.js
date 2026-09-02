import { createRSVP, updateRSVP, readRSVP } from './_lib/rsvp-service.js';
import { getSupabaseServerKey, sanitizeSupabaseError } from './_lib/supabase-admin.js';

function logRSVPAction(event, details = {}) {
    console.info(event, JSON.stringify(details));
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serverKey = getSupabaseServerKey();

    if (!supabaseUrl || !serverKey) {
        return res.status(503).json({ ok: false, error: 'RSVP_NOT_CONFIGURED' });
    }

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
        return res.status(400).json({ ok: false, error: 'INVALID_CONTENT_TYPE' });
    }

    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > 8192) {
        return res.status(413).json({ ok: false, error: 'PAYLOAD_TOO_LARGE' });
    }

    try {
        const body = req.body || {};

        if (body.website && body.website.trim() !== '') {
            return res.status(400).json({ ok: false, error: 'INVALID_REQUEST' });
        }

        const action = body.action || 'create';

        if (action === 'read') {
            const result = await readRSVP(body.rsvp_id, body.manage_token);
            if (!result.ok) {
                console.warn('RSVP_READ_REJECTED', JSON.stringify({
                    rsvp_id: body.rsvp_id || null,
                    error: result.error || 'UNKNOWN'
                }));
                return res.status(result.status || 401).json({ ok: false, error: result.error });
            }

            logRSVPAction('RSVP_READ_SUCCESS', {
                rsvp_id: body.rsvp_id
            });
            return res.status(200).json({ ok: true, rsvp: result.rsvp });

        } else if (action === 'create') {
            const result = await createRSVP({
                first_name: body.first_name,
                last_name: body.last_name,
                phone: body.phone,
                attendance_status: body.attendance_status,
                dietary_type: body.dietary_type,
                dietary_detail: body.dietary_detail
            }, 'web');

            if (!result.ok) {
                console.warn('RSVP_CREATE_REJECTED', JSON.stringify({
                    error: result.error || 'UNKNOWN'
                }));
                return res.status(result.status || 400).json({
                    ok: false,
                    error: result.error,
                    user_message: result.user_message
                });
            }

            logRSVPAction('RSVP_CREATE_SUCCESS', {
                rsvp_id: result.rsvp_id,
                attendance_status: result.attendance_status,
                reconciliation_status: result.reconciliation_status,
                sheet_sync_status: result.sheet_sync_status
            });
            return res.status(200).json({
                ok: true,
                rsvp_id: result.rsvp_id,
                manage_token: result.manage_token,
                attendance_status: result.attendance_status,
                dietary_type: result.dietary_type,
                dietary_detail: result.dietary_detail
            });

        } else if (action === 'update') {
            const result = await updateRSVP(body.rsvp_id, body.manage_token, {
                attendance_status: body.attendance_status,
                dietary_type: body.dietary_type,
                dietary_detail: body.dietary_detail
            });

            if (!result.ok) {
                console.warn('RSVP_UPDATE_REJECTED', JSON.stringify({
                    rsvp_id: body.rsvp_id || null,
                    error: result.error || 'UNKNOWN'
                }));
                return res.status(result.status || 400).json({
                    ok: false,
                    error: result.error
                });
            }

            logRSVPAction('RSVP_UPDATE_SUCCESS', {
                rsvp_id: result.rsvp_id,
                attendance_status: result.attendance_status
            });
            return res.status(200).json({
                ok: true,
                rsvp_id: result.rsvp_id,
                attendance_status: result.attendance_status,
                dietary_type: result.dietary_type,
                dietary_detail: result.dietary_detail
            });

        } else {
            console.warn('RSVP_ACTION_REJECTED', JSON.stringify({ action }));
            return res.status(400).json({ ok: false, error: 'ACTION_NOT_SUPPORTED' });
        }

    } catch (err) {
        const safeError = sanitizeSupabaseError(err);
        console.error('Server error in /api/rsvp:', safeError.code);
        return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
    }
}
