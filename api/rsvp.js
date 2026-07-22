import { createRSVP, updateRSVP, readRSVP } from './_lib/rsvp-service.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
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
                return res.status(result.status || 401).json({ ok: false, error: result.error });
            }
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
                return res.status(result.status || 400).json({
                    ok: false,
                    error: result.error,
                    user_message: result.user_message
                });
            }

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
                return res.status(result.status || 400).json({
                    ok: false,
                    error: result.error
                });
            }

            return res.status(200).json({
                ok: true,
                rsvp_id: result.rsvp_id,
                attendance_status: result.attendance_status,
                dietary_type: result.dietary_type,
                dietary_detail: result.dietary_detail
            });

        } else {
            return res.status(400).json({ ok: false, error: 'ACTION_NOT_SUPPORTED' });
        }

    } catch (err) {
        console.error('Server error in /api/rsvp:', err.message);
        return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
    }
}
