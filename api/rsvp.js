// Serverless Endpoint API Contract: RSVP Unified V2 (Phase B)
// Path: api/rsvp.js (Deployed via Vercel Serverless / Supabase Edge)

export default async function handler(req, res) {
    if (req.method === 'GET') {
        // 1. Opaque token resolution: ?i=[TOKEN_OPACO]
        const { i: token, name, phone } = req.query;

        if (token) {
            // Compute SHA-256 hash server-side
            const tokenHash = await hashToken(token);
            const guest = await findGuestByTokenHash(tokenHash);

            if (!guest) {
                return res.status(404).json({ error: 'TOKEN_NOT_FOUND', message: 'Invitación no encontrada' });
            }

            return res.status(200).json({
                guest_id: guest.id,
                display_name: guest.full_name,
                phone_exists: !!guest.phone_e164,
                attendance: guest.attendance || null,
                dietary_type: guest.dietary_type || null,
                dietary_detail: guest.dietary_detail || null
            });
        }

        if (name && phone) {
            // Guest lookup matching server-side
            const matchedGuest = await matchGuestByNameAndPhone(name, phone);
            if (!matchedGuest) {
                return res.status(200).json({
                    matched: false,
                    message: 'Necesitamos revisar tu invitación. Escríbenos al WhatsApp del matrimonio.'
                });
            }

            return res.status(200).json({
                matched: true,
                guest_id: matchedGuest.id,
                display_name: matchedGuest.full_name,
                attendance: matchedGuest.attendance || null
            });
        }

        return res.status(400).json({ error: 'INVALID_PARAMETERS' });
    }

    if (req.method === 'POST') {
        const { guest_id, attendance, dietary_type, dietary_detail, contact_phone_e164, channel, action } = req.body;
        const idempotencyKey = req.headers['idempotency-key'] || `${guest_id}-${Date.now()}`;

        if (action === 'WHATSAPP_START') {
            // Log WhatsApp redirect initiation
            await logWhatsappStart(guest_id, channel || 'web_whatsapp_click');
            return res.status(200).json({ status: 'WHATSAPP_STARTED' });
        }

        // Validate required fields
        if (!guest_id || !attendance) {
            return res.status(400).json({ error: 'MISSING_FIELDS' });
        }

        // Upsert rsvp_current & create rsvp_events & queue sheet sync
        const result = await saveRsvpState({
            guest_id,
            attendance,
            dietary_type: dietary_type || 'Ninguna',
            dietary_detail: dietary_detail || null,
            contact_phone_e164,
            channel: channel || 'web_direct',
            idempotencyKey
        });

        return res.status(200).json({
            success: true,
            status: 'CONFIRMED',
            version: result.version,
            confirmed_at: result.confirmed_at
        });
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}

// Server-side helper stubs
async function hashToken(token) {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function findGuestByTokenHash(hash) {
    // Database query via service role client (Server-Side only)
    return null; 
}

async function matchGuestByNameAndPhone(name, phone) {
    return null;
}

async function logWhatsappStart(guestId, channel) {
    return true;
}

async function saveRsvpState(payload) {
    return { version: 1, confirmed_at: new Date().toISOString() };
}
