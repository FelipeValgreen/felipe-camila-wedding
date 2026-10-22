import crypto from 'node:crypto';
import { createRSVP, updateRSVP, readRSVP } from './_lib/rsvp-service.js';
import { getSupabaseServerKey, sanitizeSupabaseError } from './_lib/supabase-admin.js';

// Privacy-preserving request correlation. The secret must be configured in Vercel
// and never sent to browsers. Without it, no visitor identifier is recorded.
// Do not treat forwarded headers as proof of a person's identity.
function getRequestAuditContext(req) {
    const requestId = req.headers['x-vercel-id'] || null;
    const agent = String(req.headers['user-agent'] || '').slice(0, 256);
    const secret = process.env.RSVP_AUDIT_HMAC_KEY;
    const forwarded = req.headers['x-forwarded-for'];
    const candidate = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
    const ip = candidate || req.socket?.remoteAddress || '';
    const ipTag = secret && ip
        ? crypto.createHmac('sha256', secret).update(ip).digest('hex').slice(0, 24)
        : null;
    return { request_id: String(requestId || '').slice(0, 128) || null, ip_tag: ipTag, user_agent: agent };
}

function logSuccessfulRSVPAction(action, rsvpId, req) {
    // Deliberately log only the opaque RSVP UUID. Never log manage tokens,
    // names, phone numbers, dietary information or other guest PII.
    console.info('RSVP_AUDIT', JSON.stringify({
        action,
        rsvp_id: rsvpId || null,
        outcome: 'success',
        ...getRequestAuditContext(req)
    }));
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
                return res.status(result.status || 401).json({ ok: false, error: result.error });
            }
            logSuccessfulRSVPAction('read', body.rsvp_id, req);
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

            logSuccessfulRSVPAction('create', result.rsvp_id, req);
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

            logSuccessfulRSVPAction('update', result.rsvp_id, req);
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
        const safeError = sanitizeSupabaseError(err);
        console.error('Server error in /api/rsvp:', safeError.code);
        return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
    }
}
